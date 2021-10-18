/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import CopyWebpackPlugin, { ObjectPattern } from 'copy-webpack-plugin';
import { createHash } from 'crypto';
import { createWriteStream, existsSync, promises as fsPromises } from 'fs';
import * as path from 'path';
import { ScriptTarget } from 'typescript';
import {
  Compiler,
  Configuration,
  ContextReplacementPlugin,
  ProgressPlugin,
  RuleSetRule,
  WebpackOptionsNormalized,
  debug,
} from 'webpack';
import { AssetPatternClass } from '../../builders/browser/schema';
import { BuildBrowserFeatures } from '../../utils';
import { WebpackConfigOptions } from '../../utils/build-options';
import { allowMangle, profilingEnabled } from '../../utils/environment-options';
import { loadEsmModule } from '../../utils/load-esm';
import { Spinner } from '../../utils/spinner';
import { addError } from '../../utils/webpack-diagnostics';
import { DedupeModuleResolvePlugin, ScriptsWebpackPlugin } from '../plugins';
import { JavaScriptOptimizerPlugin } from '../plugins/javascript-optimizer-plugin';
import { getOutputHashFormat, getWatchOptions, normalizeExtraEntryPoints } from '../utils/helpers';

// eslint-disable-next-line max-lines-per-function
export async function getCommonConfig(wco: WebpackConfigOptions): Promise<Configuration> {
  const { root, projectRoot, buildOptions, tsConfig, projectName } = wco;
  const {
    cache,
    platform = 'browser',
    sourceMap: { styles: stylesSourceMap, scripts: scriptsSourceMap, vendor: vendorSourceMap },
    optimization: { styles: stylesOptimization, scripts: scriptsOptimization },
  } = buildOptions;

  const extraPlugins: { apply(compiler: Compiler): void }[] = [];
  const extraRules: RuleSetRule[] = [];
  const entryPoints: { [key: string]: [string, ...string[]] } = {};

  // Load ESM `@angular/compiler-cli` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  const compilerCliModule = await loadEsmModule<{
    GLOBAL_DEFS_FOR_TERSER: unknown;
    default: unknown;
  }>('@angular/compiler-cli');
  // If it is not ESM then the values needed will be stored in the `default` property.
  // TODO_ESM: This can be removed once `@angular/compiler-cli` is ESM only.
  const {
    GLOBAL_DEFS_FOR_TERSER,
    GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
    VERSION: NG_VERSION,
  } = (
    compilerCliModule.GLOBAL_DEFS_FOR_TERSER ? compilerCliModule : compilerCliModule.default
  ) as typeof import('@angular/compiler-cli');

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing || 'none');
  const buildBrowserFeatures = new BuildBrowserFeatures(projectRoot);

  if (buildOptions.progress) {
    const spinner = new Spinner();
    spinner.start(`Generating ${platform} application bundles (phase: setup)...`);

    extraPlugins.push(
      new ProgressPlugin({
        handler: (percentage: number, message: string) => {
          const phase = message ? ` (phase: ${message})` : '';
          spinner.text = `Generating ${platform} application bundles${phase}...`;

          switch (percentage) {
            case 1:
              if (spinner.isSpinning) {
                spinner.succeed(
                  `${platform.replace(/^\w/, (s) =>
                    s.toUpperCase(),
                  )} application bundle generation complete.`,
                );
              }
              break;
            case 0:
              if (!spinner.isSpinning) {
                spinner.start();
              }
              break;
          }
        },
      }),
    );
  }

  if (buildOptions.main) {
    const mainPath = path.resolve(root, buildOptions.main);
    entryPoints['main'] = [mainPath];
  }

  if (platform !== 'server') {
    if (buildOptions.polyfills) {
      const projectPolyfills = path.resolve(root, buildOptions.polyfills);
      if (entryPoints['polyfills']) {
        entryPoints['polyfills'].push(projectPolyfills);
      } else {
        entryPoints['polyfills'] = [projectPolyfills];
      }
    }

    if (!buildOptions.aot) {
      const jitPolyfills = 'core-js/proposals/reflect-metadata';
      if (entryPoints['polyfills']) {
        entryPoints['polyfills'].push(jitPolyfills);
      } else {
        entryPoints['polyfills'] = [jitPolyfills];
      }
    }
  }

  if (profilingEnabled) {
    extraPlugins.push(
      new debug.ProfilingPlugin({
        outputPath: path.resolve(root, 'chrome-profiler-events.json'),
      }),
    );
  }

  // process global scripts
  const globalScriptsByBundleName = normalizeExtraEntryPoints(
    buildOptions.scripts,
    'scripts',
  ).reduce((prev: { bundleName: string; paths: string[]; inject: boolean }[], curr) => {
    const { bundleName, inject, input } = curr;
    let resolvedPath = path.resolve(root, input);

    if (!existsSync(resolvedPath)) {
      try {
        resolvedPath = require.resolve(input, { paths: [root] });
      } catch {
        throw new Error(`Script file ${input} does not exist.`);
      }
    }

    const existingEntry = prev.find((el) => el.bundleName === bundleName);
    if (existingEntry) {
      if (existingEntry.inject && !inject) {
        // All entries have to be lazy for the bundle to be lazy.
        throw new Error(`The ${bundleName} bundle is mixing injected and non-injected scripts.`);
      }

      existingEntry.paths.push(resolvedPath);
    } else {
      prev.push({
        bundleName,
        inject,
        paths: [resolvedPath],
      });
    }

    return prev;
  }, []);

  // Add a new asset for each entry.
  for (const script of globalScriptsByBundleName) {
    // Lazy scripts don't get a hash, otherwise they can't be loaded by name.
    const hash = script.inject ? hashFormat.script : '';
    const bundleName = script.bundleName;

    extraPlugins.push(
      new ScriptsWebpackPlugin({
        name: bundleName,
        sourceMap: scriptsSourceMap,
        filename: `${path.basename(bundleName)}${hash}.js`,
        scripts: script.paths,
        basePath: projectRoot,
      }),
    );
  }

  // process asset entries
  if (buildOptions.assets.length) {
    const copyWebpackPluginPatterns = buildOptions.assets.map(
      (asset: AssetPatternClass, index: number): ObjectPattern => {
        // Resolve input paths relative to workspace root and add slash at the end.
        // eslint-disable-next-line prefer-const
        let { input, output, ignore = [], glob } = asset;
        input = path.resolve(root, input).replace(/\\/g, '/');
        input = input.endsWith('/') ? input : input + '/';
        output = output.endsWith('/') ? output : output + '/';

        if (output.startsWith('..')) {
          throw new Error('An asset cannot be written to a location outside of the output path.');
        }

        return {
          context: input,
          // Now we remove starting slash to make Webpack place it from the output root.
          to: output.replace(/^\//, ''),
          from: glob,
          noErrorOnMissing: true,
          force: true,
          globOptions: {
            dot: true,
            followSymbolicLinks: !!asset.followSymlinks,
            ignore: [
              '.gitkeep',
              '**/.DS_Store',
              '**/Thumbs.db',
              // Negate patterns needs to be absolute because copy-webpack-plugin uses absolute globs which
              // causes negate patterns not to match.
              // See: https://github.com/webpack-contrib/copy-webpack-plugin/issues/498#issuecomment-639327909
              ...ignore,
            ].map((i) => path.posix.join(input, i)),
          },
          priority: index,
        };
      },
    );

    extraPlugins.push(
      new CopyWebpackPlugin({
        patterns: copyWebpackPluginPatterns,
      }),
    );
  }

  if (buildOptions.showCircularDependencies) {
    const CircularDependencyPlugin = require('circular-dependency-plugin');
    extraPlugins.push(
      new CircularDependencyPlugin({
        exclude: /[\\/]node_modules[\\/]/,
      }),
    );
  }

  if (buildOptions.extractLicenses) {
    const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
    extraPlugins.push(
      new LicenseWebpackPlugin({
        stats: {
          warnings: false,
          errors: false,
        },
        perChunkOutput: false,
        outputFilename: '3rdpartylicenses.txt',
        skipChildCompilers: true,
      }),
    );
  }

  if (buildOptions.statsJson) {
    extraPlugins.push(
      new (class {
        apply(compiler: Compiler) {
          compiler.hooks.done.tapPromise('angular-cli-stats', async (stats) => {
            const { stringifyStream } = await import('@discoveryjs/json-ext');
            const data = stats.toJson('verbose');
            const statsOutputPath = path.resolve(root, buildOptions.outputPath, 'stats.json');

            try {
              await fsPromises.mkdir(path.dirname(statsOutputPath), { recursive: true });

              await new Promise<void>((resolve, reject) =>
                stringifyStream(data)
                  .pipe(createWriteStream(statsOutputPath))
                  .on('close', resolve)
                  .on('error', reject),
              );
            } catch (error) {
              addError(
                stats.compilation,
                `Unable to write stats file: ${error.message || 'unknown error'}`,
              );
            }
          });
        }
      })(),
    );
  }

  if (scriptsSourceMap || stylesSourceMap) {
    extraRules.push({
      test: /\.[cm]?jsx?$/,
      enforce: 'pre',
      loader: require.resolve('source-map-loader'),
      options: {
        filterSourceMappingUrl: (_mapUri: string, resourcePath: string) => {
          if (vendorSourceMap) {
            // Consume all sourcemaps when vendor option is enabled.
            return true;
          }

          // Don't consume sourcemaps in node_modules when vendor is disabled.
          // But, do consume local libraries sourcemaps.
          return !resourcePath.includes('node_modules');
        },
      },
    });
  }

  const extraMinimizers = [];
  if (scriptsOptimization) {
    extraMinimizers.push(
      new JavaScriptOptimizerPlugin({
        define: buildOptions.aot ? GLOBAL_DEFS_FOR_TERSER_WITH_AOT : GLOBAL_DEFS_FOR_TERSER,
        sourcemap: scriptsSourceMap,
        target: wco.scriptTarget,
        keepNames: !allowMangle || platform === 'server',
        removeLicenses: buildOptions.extractLicenses,
        advanced: buildOptions.buildOptimizer,
      }),
    );
  }

  return {
    mode: scriptsOptimization || stylesOptimization.minify ? 'production' : 'development',
    devtool: false,
    target: [
      platform === 'server' ? 'node' : 'web',
      tsConfig.options.target === ScriptTarget.ES5 ? 'es5' : 'es2015',
    ],
    profile: buildOptions.statsJson,
    resolve: {
      roots: [projectRoot],
      extensions: ['.ts', '.tsx', '.mjs', '.js'],
      symlinks: !buildOptions.preserveSymlinks,
      modules: [tsConfig.options.baseUrl || projectRoot, 'node_modules'],
    },
    resolveLoader: {
      symlinks: !buildOptions.preserveSymlinks,
    },
    context: root,
    entry: entryPoints,
    output: {
      uniqueName: projectName,
      hashFunction: 'xxhash64', // todo: remove in webpack 6. This is part of `futureDefaults`.
      clean: buildOptions.deleteOutputPath ?? true,
      path: path.resolve(root, buildOptions.outputPath),
      publicPath: buildOptions.deployUrl ?? '',
      filename: `[name]${hashFormat.chunk}.js`,
      chunkFilename: `[name]${hashFormat.chunk}.js`,
    },
    watch: buildOptions.watch,
    watchOptions: getWatchOptions(buildOptions.poll),
    performance: {
      hints: false,
    },
    ignoreWarnings: [
      // https://github.com/webpack-contrib/source-map-loader/blob/b2de4249c7431dd8432da607e08f0f65e9d64219/src/index.js#L83
      /Failed to parse source map from/,
      // https://github.com/webpack-contrib/postcss-loader/blob/bd261875fdf9c596af4ffb3a1a73fe3c549befda/src/index.js#L153-L158
      /Add postcss as project dependency/,
    ],
    module: {
      // Show an error for missing exports instead of a warning.
      strictExportPresence: true,
      rules: [
        {
          // Mark files inside `rxjs/add` as containing side effects.
          // If this is fixed upstream and the fixed version becomes the minimum
          // supported version, this can be removed.
          test: /[/\\]rxjs[/\\]add[/\\].+\.js$/,
          sideEffects: true,
        },
        {
          test: /\.[cm]?[tj]sx?$/,
          // The below is needed due to a bug in `@babel/runtime`. See: https://github.com/babel/babel/issues/12824
          resolve: { fullySpecified: false },
          exclude: [/[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill)[/\\]/],
          use: [
            {
              loader: require.resolve('../../babel/webpack-loader'),
              options: {
                cacheDirectory: (cache.enabled && path.join(cache.path, 'babel-webpack')) || false,
                scriptTarget: wco.scriptTarget,
                aot: buildOptions.aot,
                optimize: buildOptions.buildOptimizer,
              },
            },
          ],
        },
        ...extraRules,
      ],
    },
    experiments: {
      syncWebAssembly: true,
      asyncWebAssembly: true,
    },
    infrastructureLogging: {
      level: buildOptions.verbose ? 'verbose' : 'error',
    },
    cache: getCacheSettings(wco, buildBrowserFeatures.supportedBrowsers, NG_VERSION.full),
    optimization: {
      minimizer: extraMinimizers,
      moduleIds: 'deterministic',
      chunkIds: buildOptions.namedChunks ? 'named' : 'deterministic',
      emitOnErrors: false,
    },
    plugins: [new DedupeModuleResolvePlugin({ verbose: buildOptions.verbose }), ...extraPlugins],
  };
}

function getCacheSettings(
  wco: WebpackConfigOptions,
  supportedBrowsers: string[],
  angularVersion: string,
): WebpackOptionsNormalized['cache'] {
  const { enabled, path: cacheDirectory } = wco.buildOptions.cache;
  if (enabled) {
    const packageVersion = require('../../../package.json').version;

    return {
      type: 'filesystem',
      cacheDirectory: path.join(cacheDirectory, 'angular-webpack'),
      maxMemoryGenerations: 1,
      // We use the versions and build options as the cache name. The Webpack configurations are too
      // dynamic and shared among different build types: test, build and serve.
      // None of which are "named".
      name: createHash('sha1')
        .update(angularVersion)
        .update(packageVersion)
        .update(wco.projectRoot)
        .update(JSON.stringify(wco.tsConfig))
        .update(
          JSON.stringify({
            ...wco.buildOptions,
            // Needed because outputPath changes on every build when using i18n extraction
            // https://github.com/angular/angular-cli/blob/736a5f89deaca85f487b78aec9ff66d4118ceb6a/packages/angular_devkit/build_angular/src/utils/i18n-options.ts#L264-L265
            outputPath: undefined,
          }),
        )
        .update(supportedBrowsers.join(''))
        .digest('hex'),
    };
  }

  if (wco.buildOptions.watch) {
    return {
      type: 'memory',
      maxGenerations: 1,
    };
  }

  return false;
}
