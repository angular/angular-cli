/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildOptimizerWebpackPlugin,
  buildOptimizerLoaderPath,
} from '@angular-devkit/build-optimizer';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { createWriteStream, existsSync, promises as fsPromises } from 'fs';
import * as path from 'path';
import { ScriptTarget } from 'typescript';
import {
  Compiler,
  Configuration,
  ContextReplacementPlugin,
  ProgressPlugin,
  RuleSetRule,
  debug,
} from 'webpack';
import { AssetPatternClass } from '../../browser/schema';
import { BuildBrowserFeatures } from '../../utils';
import { WebpackConfigOptions } from '../../utils/build-options';
import { findCachePath } from '../../utils/cache-path';
import {
  allowMangle,
  allowMinify,
  cachingDisabled,
  maxWorkers,
  profilingEnabled,
  shouldBeautify,
} from '../../utils/environment-options';
import { findAllNodeModules } from '../../utils/find-up';
import { Spinner } from '../../utils/spinner';
import { addError } from '../../utils/webpack-diagnostics';
import { DedupeModuleResolvePlugin, ScriptsWebpackPlugin } from '../plugins';
import {
  getEsVersionForFileName,
  getOutputHashFormat,
  getWatchOptions,
  normalizeExtraEntryPoints,
} from '../utils/helpers';
import { IGNORE_WARNINGS } from '../utils/stats';

// eslint-disable-next-line max-lines-per-function
export function getCommonConfig(wco: WebpackConfigOptions): Configuration {
  const { root, projectRoot, buildOptions, tsConfig } = wco;
  const {
    platform = 'browser',
    sourceMap: { styles: stylesSourceMap, scripts: scriptsSourceMap, vendor: vendorSourceMap },
    optimization: { styles: stylesOptimization, scripts: scriptsOptimization },
  } = buildOptions;

  const extraPlugins: { apply(compiler: Compiler): void }[] = [];
  const extraRules: RuleSetRule[] = [];
  const entryPoints: { [key: string]: [string, ...string[]] } = {};

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing || 'none');
  const buildBrowserFeatures = new BuildBrowserFeatures(projectRoot);

  const targetInFileName = getEsVersionForFileName(
    tsConfig.options.target,
    buildOptions.differentialLoadingNeeded,
  );

  if (buildOptions.main) {
    const mainPath = path.resolve(root, buildOptions.main);
    entryPoints['main'] = [mainPath];
  }

  const differentialLoadingMode = buildOptions.differentialLoadingNeeded && !buildOptions.watch;
  if (platform !== 'server') {
    if (differentialLoadingMode || tsConfig.options.target === ScriptTarget.ES5) {
      if (buildBrowserFeatures.isEs5SupportNeeded()) {
        const polyfillsChunkName = 'polyfills-es5';
        entryPoints[polyfillsChunkName] = [path.join(__dirname, '..', 'es5-polyfills.js')];

        if (!buildOptions.aot) {
          if (differentialLoadingMode) {
            entryPoints[polyfillsChunkName].push(path.join(__dirname, '..', 'jit-polyfills.js'));
          }
          entryPoints[polyfillsChunkName].push(path.join(__dirname, '..', 'es5-jit-polyfills.js'));
        }
        // If not performing a full differential build the polyfills need to be added to ES5 bundle
        if (buildOptions.polyfills) {
          entryPoints[polyfillsChunkName].push(path.resolve(root, buildOptions.polyfills));
        }
      }
    }

    if (buildOptions.polyfills) {
      const projectPolyfills = path.resolve(root, buildOptions.polyfills);
      if (entryPoints['polyfills']) {
        entryPoints['polyfills'].push(projectPolyfills);
      } else {
        entryPoints['polyfills'] = [projectPolyfills];
      }
    }

    if (!buildOptions.aot) {
      const jitPolyfills = path.join(__dirname, '..', 'jit-polyfills.js');
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
    const copyWebpackPluginPatterns = buildOptions.assets.map((asset: AssetPatternClass) => {
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
      };
    });

    extraPlugins.push(
      new CopyWebpackPlugin({
        patterns: copyWebpackPluginPatterns,
      }),
    );
  }

  if (buildOptions.progress) {
    const spinner = new Spinner();

    let previousPercentage: number | undefined;
    extraPlugins.push(
      new ProgressPlugin({
        handler: (percentage: number, message: string) => {
          if (previousPercentage === 1 && percentage !== 0) {
            // In some scenarios in Webpack 5 percentage goes from 1 back to 0.99.
            // Ex: 0.99 -> 1 -> 0.99 -> 1
            // This causes the "complete" message to be displayed multiple times.

            return;
          }

          switch (percentage) {
            case 0:
              spinner.start(`Generating ${platform} application bundles...`);
              break;
            case 1:
              spinner.succeed(
                `${platform.replace(/^\w/, (s) =>
                  s.toUpperCase(),
                )} application bundle generation complete.`,
              );
              break;
            default:
              spinner.text = `Generating ${platform} application bundles (phase: ${message})...`;
              break;
          }

          previousPercentage = percentage;
        },
      }),
    );
  }

  if (buildOptions.showCircularDependencies) {
    const CircularDependencyPlugin = require('circular-dependency-plugin');
    extraPlugins.push(
      new CircularDependencyPlugin({
        exclude: /[\\\/]node_modules[\\\/]/,
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
      test: /\.m?js$/,
      exclude: vendorSourceMap ? undefined : /[\\\/]node_modules[\\\/]/,
      enforce: 'pre',
      loader: require.resolve('source-map-loader'),
    });
  }

  let buildOptimizerUseRule: RuleSetRule[] = [];
  if (buildOptions.buildOptimizer) {
    extraPlugins.push(new BuildOptimizerWebpackPlugin());
    buildOptimizerUseRule = [
      {
        loader: buildOptimizerLoaderPath,
        options: { sourceMap: scriptsSourceMap },
      },
    ];
  }

  const extraMinimizers = [];

  if (scriptsOptimization) {
    const TerserPlugin = require('terser-webpack-plugin');
    const {
      GLOBAL_DEFS_FOR_TERSER,
      GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
    } = require('@angular/compiler-cli');

    const angularGlobalDefinitions = buildOptions.aot
      ? GLOBAL_DEFS_FOR_TERSER_WITH_AOT
      : GLOBAL_DEFS_FOR_TERSER;

    // TODO: Investigate why this fails for some packages: wco.supportES2015 ? 6 : 5;
    const terserEcma = 5;

    const terserOptions = {
      warnings: !!buildOptions.verbose,
      safari10: true,
      output: {
        ecma: terserEcma,
        // For differential loading, this is handled in the bundle processing.
        ascii_only: !differentialLoadingMode,
        // Default behavior (undefined value) is to keep only important comments (licenses, etc.)
        comments: !buildOptions.extractLicenses && undefined,
        webkit: true,
        beautify: shouldBeautify,
        wrap_func_args: false,
      },
      // On server, we don't want to compress anything. We still set the ngDevMode = false for it
      // to remove dev code, and ngI18nClosureMode to remove Closure compiler i18n code
      compress:
        allowMinify &&
        (platform === 'server'
          ? {
              ecma: terserEcma,
              global_defs: angularGlobalDefinitions,
              keep_fnames: true,
            }
          : {
              ecma: terserEcma,
              pure_getters: buildOptions.buildOptimizer,
              // PURE comments work best with 3 passes.
              // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
              passes: buildOptions.buildOptimizer ? 3 : 1,
              global_defs: angularGlobalDefinitions,
              pure_funcs: ['forwardRef'],
            }),
      // We also want to avoid mangling on server.
      // Name mangling is handled within the browser builder
      mangle: allowMangle && platform !== 'server' && !differentialLoadingMode,
    };

    const globalScriptsNames = globalScriptsByBundleName.map((s) => s.bundleName);

    extraMinimizers.push(
      new TerserPlugin({
        parallel: maxWorkers,
        extractComments: false,
        exclude: globalScriptsNames,
        terserOptions,
      }),
      // Script bundles are fully optimized here in one step since they are never downleveled.
      // They are shared between ES2015 & ES5 outputs so must support ES5.
      new TerserPlugin({
        parallel: maxWorkers,
        extractComments: false,
        include: globalScriptsNames,
        terserOptions: {
          ...terserOptions,
          compress: allowMinify && {
            ...terserOptions.compress,
            ecma: 5,
          },
          output: {
            ...terserOptions.output,
            ecma: 5,
          },
          mangle: allowMangle && platform !== 'server',
        },
      }),
    );
  }

  return {
    mode: scriptsOptimization || stylesOptimization.minify ? 'production' : 'development',
    devtool: false,
    profile: buildOptions.statsJson,
    resolve: {
      roots: [projectRoot],
      extensions: ['.ts', '.tsx', '.mjs', '.js'],
      symlinks: !buildOptions.preserveSymlinks,
      modules: [wco.tsConfig.options.baseUrl || projectRoot, 'node_modules'],
    },
    resolveLoader: {
      symlinks: !buildOptions.preserveSymlinks,
      modules: [
        // Allow loaders to be in a node_modules nested inside the devkit/build-angular package.
        // This is important in case loaders do not get hoisted.
        // If this file moves to another location, alter potentialNodeModules as well.
        'node_modules',
        ...findAllNodeModules(__dirname, projectRoot),
      ],
    },
    context: root,
    entry: entryPoints,
    output: {
      clean: buildOptions.deleteOutputPath,
      path: path.resolve(root, buildOptions.outputPath),
      publicPath: buildOptions.deployUrl ?? '',
      filename: ({ chunk }) => {
        if (chunk?.name === 'polyfills-es5') {
          return `polyfills-es5${hashFormat.chunk}.js`;
        } else {
          return `[name]${targetInFileName}${hashFormat.chunk}.js`;
        }
      },
      chunkFilename: `[id]${targetInFileName}${hashFormat.chunk}.js`,
    },
    watch: buildOptions.watch,
    watchOptions: getWatchOptions(buildOptions.poll),
    performance: {
      hints: false,
    },
    ignoreWarnings: IGNORE_WARNINGS,
    module: {
      // Show an error for missing exports instead of a warning.
      strictExportPresence: true,
      rules: [
        {
          // Mark files inside `@angular/core` as using SystemJS style dynamic imports.
          // Removing this will cause deprecation warnings to appear.
          test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
          parser: { system: true },
        },
        {
          // Mark files inside `rxjs/add` as containing side effects.
          // If this is fixed upstream and the fixed version becomes the minimum
          // supported version, this can be removed.
          test: /[\/\\]rxjs[\/\\]add[\/\\].+\.js$/,
          sideEffects: true,
        },
        {
          test: /\.[cm]?js$|\.tsx?$/,
          // The below is needed due to a bug in `@babel/runtime`. See: https://github.com/babel/babel/issues/12824
          resolve: { fullySpecified: false },
          exclude: [/[\/\\](?:core-js|\@babel|tslib|web-animations-js)[\/\\]/],
          use: [
            {
              loader: require.resolve('../../babel/webpack-loader'),
              options: {
                cacheDirectory: findCachePath('babel-webpack'),
                scriptTarget: wco.scriptTarget,
                aot: buildOptions.aot,
              },
            },
            ...buildOptimizerUseRule,
          ],
        },
        ...extraRules,
      ],
    },
    experiments: {
      syncWebAssembly: true,
      asyncWebAssembly: true,
    },
    cache: !!buildOptions.watch &&
      !cachingDisabled && {
        type: 'memory',
        maxGenerations: 1,
      },
    optimization: {
      minimizer: extraMinimizers,
      moduleIds: 'deterministic',
      chunkIds: buildOptions.namedChunks ? 'named' : 'deterministic',
      emitOnErrors: false,
    },
    plugins: [
      // Always replace the context for the System.import in angular/core to prevent warnings.
      // https://github.com/angular/angular/issues/11580
      new ContextReplacementPlugin(
        /\@angular(\\|\/)core(\\|\/)/,
        path.join(projectRoot, '$_lazy_route_resources'),
        {},
      ),
      new DedupeModuleResolvePlugin({ verbose: buildOptions.verbose }),
      ...extraPlugins,
    ],
  };
}
