/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { AngularWebpackLoaderPath } from '@ngtools/webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import * as path from 'path';
import { ScriptTarget } from 'typescript';
import {
  Compiler,
  Configuration,
  ContextReplacementPlugin,
  RuleSetRule,
  SourceMapDevToolPlugin,
  debug,
} from 'webpack';
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity';
import { AngularBabelLoaderOptions } from '../../babel/webpack-loader';
import { BuildBrowserFeatures } from '../../utils';
import { WebpackConfigOptions } from '../../utils/build-options';
import { allowMangle, profilingEnabled } from '../../utils/environment-options';
import { loadEsmModule } from '../../utils/load-esm';
import {
  CommonJsUsageWarnPlugin,
  DedupeModuleResolvePlugin,
  JavaScriptOptimizerPlugin,
  JsonStatsPlugin,
  ScriptsWebpackPlugin,
} from '../plugins';
import { ProgressPlugin } from '../plugins/progress-plugin';
import { createIvyPlugin } from '../plugins/typescript';
import {
  assetPatterns,
  externalizePackages,
  getCacheSettings,
  getInstrumentationExcludedPaths,
  getOutputHashFormat,
  getStatsOptions,
  globalScriptsByBundleName,
} from '../utils/helpers';

// eslint-disable-next-line max-lines-per-function
export async function getCommonConfig(wco: WebpackConfigOptions): Promise<Configuration> {
  const { root, projectRoot, buildOptions, tsConfig, projectName, sourceRoot, tsConfigPath } = wco;
  const {
    cache,
    codeCoverage,
    crossOrigin = 'none',
    platform = 'browser',
    aot = true,
    codeCoverageExclude = [],
    main,
    polyfills,
    sourceMap: {
      styles: stylesSourceMap,
      scripts: scriptsSourceMap,
      vendor: vendorSourceMap,
      hidden: hiddenSourceMap,
    },
    optimization: { styles: stylesOptimization, scripts: scriptsOptimization },
    commonChunk,
    vendorChunk,
    subresourceIntegrity,
    verbose,
    poll,
    webWorkerTsConfig,
    externalDependencies = [],
    allowedCommonJsDependencies,
    bundleDependencies,
  } = buildOptions;

  const isPlatformServer = buildOptions.platform === 'server';
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
    extraPlugins.push(new ProgressPlugin(platform));
  }

  if (buildOptions.main) {
    const mainPath = path.resolve(root, buildOptions.main);
    entryPoints['main'] = [mainPath];
  }

  if (isPlatformServer) {
    // Fixes Critical dependency: the request of a dependency is an expression
    extraPlugins.push(new ContextReplacementPlugin(/@?hapi|express[\\/]/));
  }

  if (!isPlatformServer) {
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

  if (allowedCommonJsDependencies) {
    // When this is not defined it means the builder doesn't support showing common js usages.
    // When it does it will be an array.
    extraPlugins.push(
      new CommonJsUsageWarnPlugin({
        allowedDependencies: allowedCommonJsDependencies,
      }),
    );
  }

  // process global scripts
  // Add a new asset for each entry.
  for (const { bundleName, inject, paths } of globalScriptsByBundleName(
    root,
    buildOptions.scripts,
  )) {
    // Lazy scripts don't get a hash, otherwise they can't be loaded by name.
    const hash = inject ? hashFormat.script : '';

    extraPlugins.push(
      new ScriptsWebpackPlugin({
        name: bundleName,
        sourceMap: scriptsSourceMap,
        scripts: paths,
        filename: `${path.basename(bundleName)}${hash}.js`,
        basePath: projectRoot,
      }),
    );
  }

  // process asset entries
  if (buildOptions.assets.length) {
    extraPlugins.push(
      new CopyWebpackPlugin({
        patterns: assetPatterns(root, buildOptions.assets),
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

  if (scriptsSourceMap || stylesSourceMap) {
    const include = [];
    if (scriptsSourceMap) {
      include.push(/js$/);
    }

    if (stylesSourceMap) {
      include.push(/css$/);
    }

    extraPlugins.push(
      new SourceMapDevToolPlugin({
        filename: '[file].map',
        include,
        // We want to set sourceRoot to  `webpack:///` for non
        // inline sourcemaps as otherwise paths to sourcemaps will be broken in browser
        // `webpack:///` is needed for Visual Studio breakpoints to work properly as currently
        // there is no way to set the 'webRoot'
        sourceRoot: 'webpack:///',
        moduleFilenameTemplate: '[resource-path]',
        append: hiddenSourceMap ? false : undefined,
      }),
    );
  }

  if (buildOptions.statsJson) {
    extraPlugins.push(
      new JsonStatsPlugin(path.resolve(root, buildOptions.outputPath, 'stats.json')),
    );
  }

  if (subresourceIntegrity) {
    extraPlugins.push(
      new SubresourceIntegrityPlugin({
        hashFuncNames: ['sha384'],
      }),
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

  if (main || polyfills) {
    extraRules.push({
      test: /\.[cm]?[tj]sx?$/,
      loader: AngularWebpackLoaderPath,
    });
    extraPlugins.push(createIvyPlugin(wco, aot, tsConfigPath));
  }

  if (webWorkerTsConfig) {
    extraPlugins.push(createIvyPlugin(wco, false, path.resolve(wco.root, webWorkerTsConfig)));
  }

  const extraMinimizers = [];
  if (scriptsOptimization) {
    extraMinimizers.push(
      new JavaScriptOptimizerPlugin({
        define: buildOptions.aot ? GLOBAL_DEFS_FOR_TERSER_WITH_AOT : GLOBAL_DEFS_FOR_TERSER,
        sourcemap: scriptsSourceMap,
        target: wco.scriptTarget,
        keepNames: !allowMangle || isPlatformServer,
        removeLicenses: buildOptions.extractLicenses,
        advanced: buildOptions.buildOptimizer,
      }),
    );
  }

  const externals: Configuration['externals'] = [...externalDependencies];
  if (isPlatformServer && !bundleDependencies) {
    externals.push(({ context, request }, callback) =>
      externalizePackages(context ?? wco.projectRoot, request, callback),
    );
  }

  let crossOriginLoading: NonNullable<Configuration['output']>['crossOriginLoading'] = false;
  if (subresourceIntegrity && crossOrigin === 'none') {
    crossOriginLoading = 'anonymous';
  } else if (crossOrigin !== 'none') {
    crossOriginLoading = crossOrigin;
  }

  return {
    mode: scriptsOptimization || stylesOptimization.minify ? 'production' : 'development',
    devtool: false,
    target: [
      isPlatformServer ? 'node' : 'web',
      tsConfig.options.target === ScriptTarget.ES5 ? 'es5' : 'es2015',
    ],
    profile: buildOptions.statsJson,
    resolve: {
      roots: [projectRoot],
      extensions: ['.ts', '.tsx', '.mjs', '.js'],
      symlinks: !buildOptions.preserveSymlinks,
      modules: [tsConfig.options.baseUrl || projectRoot, 'node_modules'],
      mainFields: isPlatformServer
        ? ['es2020', 'es2015', 'module', 'main']
        : ['es2020', 'es2015', 'browser', 'module', 'main'],
      conditionNames: ['es2020', 'es2015', '...'],
    },
    resolveLoader: {
      symlinks: !buildOptions.preserveSymlinks,
    },
    context: root,
    entry: entryPoints,
    externals,
    output: {
      uniqueName: projectName,
      hashFunction: 'xxhash64', // todo: remove in webpack 6. This is part of `futureDefaults`.
      clean: buildOptions.deleteOutputPath ?? true,
      path: path.resolve(root, buildOptions.outputPath),
      publicPath: buildOptions.deployUrl ?? '',
      filename: `[name]${hashFormat.chunk}.js`,
      chunkFilename: `[name]${hashFormat.chunk}.js`,
      libraryTarget: isPlatformServer ? 'commonjs' : undefined,
      crossOriginLoading,
      trustedTypes: 'angular#bundler',
      scriptType: 'module',
    },
    watch: buildOptions.watch,
    watchOptions: {
      poll,
      ignored: poll === undefined ? undefined : 'node_modules/**',
    },
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
      parser:
        webWorkerTsConfig === undefined
          ? {
              javascript: {
                worker: false,
                url: false,
              },
            }
          : undefined,

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
                instrumentCode: codeCoverage
                  ? {
                      includedBasePath: sourceRoot,
                      excludedPaths: getInstrumentationExcludedPaths(root, codeCoverageExclude),
                    }
                  : undefined,
              } as AngularBabelLoaderOptions,
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
      level: verbose ? 'verbose' : 'error',
    },
    stats: getStatsOptions(verbose),
    cache: getCacheSettings(wco, buildBrowserFeatures.supportedBrowsers, NG_VERSION.full),
    optimization: {
      minimizer: extraMinimizers,
      moduleIds: 'deterministic',
      chunkIds: buildOptions.namedChunks ? 'named' : 'deterministic',
      emitOnErrors: false,
      runtimeChunk: isPlatformServer ? false : 'single',
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: !!commonChunk && {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: !!commonChunk && {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          defaultVendors: !!vendorChunk && {
            name: 'vendor',
            chunks: (chunk) => chunk.name === 'main',
            enforce: true,
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
    plugins: [new DedupeModuleResolvePlugin({ verbose }), ...extraPlugins],
    node: false,
  };
}
