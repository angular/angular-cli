// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import * as path from 'path';
import { HashedModuleIdsPlugin } from 'webpack';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { extraEntryParser, getOutputHashFormat, AssetPattern } from './utils';
import { isDirectory } from '../../utilities/is-directory';
import { requireProjectModule } from '../../utilities/require-project-module';
import { WebpackConfigOptions } from '../build-options';
import { BundleBudgetPlugin } from '../../plugins/bundle-budget';
import { CleanCssWebpackPlugin } from '../../plugins/cleancss-webpack-plugin';
import { ScriptsWebpackPlugin } from '../../plugins/scripts-webpack-plugin';
import { findUp } from '../../utilities/find-up';

const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const SilentError = require('silent-error');
const resolve = require('resolve');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('url-loader')
 * require('file-loader')
 * require('cache-loader')
 * require('@angular-devkit/build-optimizer')
 */

export function getCommonConfig(wco: WebpackConfigOptions) {
  const { root, projectRoot, buildOptions, appConfig } = wco;

  const nodeModules = findUp('node_modules', projectRoot);
  if (!nodeModules) {
    throw new Error('Cannot locate node_modules directory.')
  }

  let extraPlugins: any[] = [];
  let entryPoints: { [key: string]: string[] } = {};

  if (appConfig.main) {
    entryPoints['main'] = [path.resolve(root, appConfig.main)];
  }

  if (appConfig.polyfills) {
    entryPoints['polyfills'] = [path.resolve(root, appConfig.polyfills)];
  }

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing as any);

  // process global scripts
  if (appConfig.scripts.length > 0) {
    const globalScripts = extraEntryParser(appConfig.scripts, root, 'scripts');
    const globalScriptsByEntry = globalScripts
      .reduce((prev: { entry: string, paths: string[], lazy: boolean }[], curr) => {

        let existingEntry = prev.find((el) => el.entry === curr.entry);
        if (existingEntry) {
          existingEntry.paths.push(curr.path as string);
          // All entries have to be lazy for the bundle to be lazy.
          (existingEntry as any).lazy = existingEntry.lazy && curr.lazy;
        } else {
          prev.push({
            entry: curr.entry as string, paths: [curr.path as string],
            lazy: curr.lazy as boolean
          });
        }
        return prev;
      }, []);


    // Add a new asset for each entry.
    globalScriptsByEntry.forEach((script) => {
      // Lazy scripts don't get a hash, otherwise they can't be loaded by name.
      const hash = script.lazy ? '' : hashFormat.script;
      extraPlugins.push(new ScriptsWebpackPlugin({
        name: script.entry,
        sourceMap: buildOptions.sourceMap,
        filename: `${path.basename(script.entry)}${hash}.js`,
        scripts: script.paths,
        basePath: projectRoot,
      }));
    });
  }

  // process asset entries
  if (appConfig.assets) {
    const copyWebpackPluginPatterns = appConfig.assets.map((asset: AssetPattern) => {
      // Add defaults.
      // Input is always resolved relative to the projectRoot.
      // TODO: add smart defaults to schema to use project root as default.
      asset.input = path.resolve(root, asset.input || projectRoot).replace(/\\/g, '/');
      asset.output = asset.output || '';
      asset.glob = asset.glob || '';

      // Prevent asset configurations from writing outside of the output path, except if the user
      // specify a configuration flag.
      // Also prevent writing outside the project path. That is not overridable.
      const absoluteOutputPath = path.resolve(projectRoot, buildOptions.outputPath as string);
      const absoluteAssetOutput = path.resolve(absoluteOutputPath, asset.output);
      const outputRelativeOutput = path.relative(absoluteOutputPath, absoluteAssetOutput);

      if (outputRelativeOutput.startsWith('..') || path.isAbsolute(outputRelativeOutput)) {

        // TODO: This check doesn't make a lot of sense anymore with multiple project. Review it.
        // const projectRelativeOutput = path.relative(projectRoot, absoluteAssetOutput);
        // if (projectRelativeOutput.startsWith('..') || path.isAbsolute(projectRelativeOutput)) {
        //   const message = 'An asset cannot be written to a location outside the project.';
        //   throw new SilentError(message);
        // }

        if (!asset.allowOutsideOutDir) {
          const message = 'An asset cannot be written to a location outside of the output path. '
            + 'You can override this message by setting the `allowOutsideOutDir` '
            + 'property on the asset to true in the CLI configuration.';
          throw new SilentError(message);
        }
      }

      // TODO: This check doesn't make a lot of sense anymore with multiple project. Review it.
      // Prevent asset configurations from reading files outside of the project.
      // const projectRelativeInput = path.relative(projectRoot, asset.input);
      // if (projectRelativeInput.startsWith('..') || path.isAbsolute(projectRelativeInput)) {
      //   const message = 'An asset cannot be read from a location outside the project.';
      //   throw new SilentError(message);
      // }

      // Ensure trailing slash.
      if (isDirectory(path.resolve(asset.input))) {
        asset.input += '/';
      }

      // Convert dir patterns to globs.
      if (isDirectory(path.resolve(asset.input, asset.glob))) {
        asset.glob = asset.glob + '/**/*';
      }

      return {
        context: asset.input,
        to: asset.output,
        from: {
          glob: asset.glob,
          dot: true
        }
      };
    });

    const copyWebpackPluginOptions = { ignore: ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'] };

    const copyWebpackPluginInstance = new CopyWebpackPlugin(copyWebpackPluginPatterns,
      copyWebpackPluginOptions);

    // Save options so we can use them in eject.
    (copyWebpackPluginInstance as any)['copyWebpackPluginPatterns'] = copyWebpackPluginPatterns;
    (copyWebpackPluginInstance as any)['copyWebpackPluginOptions'] = copyWebpackPluginOptions;

    extraPlugins.push(copyWebpackPluginInstance);
  }

  if (buildOptions.progress) {
    extraPlugins.push(new ProgressPlugin({ profile: buildOptions.verbose, colors: true }));
  }

  if (buildOptions.showCircularDependencies) {
    extraPlugins.push(new CircularDependencyPlugin({
      exclude: /[\\\/]node_modules[\\\/]/
    }));
  }

  if (buildOptions.statsJson) {
    extraPlugins.push(new StatsPlugin('stats.json', 'verbose'));
  }

  let buildOptimizerUseRule;
  if (buildOptions.buildOptimizer) {
    // Set the cache directory to the Build Optimizer dir, so that package updates will delete it.
    const buildOptimizerDir = path.dirname(
      resolve.sync('@angular-devkit/build-optimizer', { basedir: projectRoot }));
    const cacheDirectory = path.resolve(buildOptimizerDir, './.cache/');

    buildOptimizerUseRule = {
      use: [
        {
          loader: 'cache-loader',
          options: { cacheDirectory }
        },
        {
          loader: '@angular-devkit/build-optimizer/webpack-loader',
          options: { sourceMap: buildOptions.sourceMap }
        },
      ],
    };
  }

  // Allow loaders to be in a node_modules nested inside the CLI package
  const loaderNodeModules = ['node_modules'];
  const potentialNodeModules = path.join(__dirname, '..', '..', 'node_modules');
  if (isDirectory(potentialNodeModules)) {
    loaderNodeModules.push(potentialNodeModules);
  }

  // Load rxjs path aliases.
  // https://github.com/ReactiveX/rxjs/blob/master/doc/lettable-operators.md#build-and-treeshaking
  let alias = {};
  try {
    const rxjsPathMappingImport = wco.supportES2015
      ? 'rxjs/_esm2015/path-mapping'
      : 'rxjs/_esm5/path-mapping';
    const rxPaths = requireProjectModule(projectRoot, rxjsPathMappingImport);
    alias = rxPaths(nodeModules);
  } catch (e) { }

  return {
    mode: buildOptions.optimization ? 'production': 'development',
    devtool: false,
    resolve: {
      extensions: ['.ts', '.js'],
      symlinks: !buildOptions.preserveSymlinks,
      modules: [projectRoot, 'node_modules'],
      alias
    },
    resolveLoader: {
      modules: loaderNodeModules
    },
    context: projectRoot,
    entry: entryPoints,
    output: {
      path: path.resolve(root, buildOptions.outputPath as string),
      publicPath: buildOptions.deployUrl,
      filename: `[name]${hashFormat.chunk}.js`,
    },
    performance: {
      hints: false,
    },
    module: {
      rules: [
        { test: /\.html$/, loader: 'raw-loader' },
        {
          test: /\.(eot|svg|cur)$/,
          loader: 'file-loader',
          options: {
            name: `[name]${hashFormat.file}.[ext]`,
            limit: 10000
          }
        },
        {
          test: /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
          loader: 'url-loader',
          options: {
            name: `[name]${hashFormat.file}.[ext]`,
            limit: 10000
          }
        },
        {
          test: /[\/\\]@angular[\/\\].+\.js$/,
          sideEffects: false,
          parser: { system: true },
          ...buildOptimizerUseRule,
        },
        {
          test: /\.js$/,
          ...buildOptimizerUseRule,
        },
      ]
    },
    optimization: {
      noEmitOnErrors: true,
      minimizer: [
        new HashedModuleIdsPlugin(),
        // TODO: check with Mike what this feature needs.
        new BundleBudgetPlugin({ budgets: appConfig.budgets }),
        new CleanCssWebpackPlugin({
          sourceMap: buildOptions.sourceMap,
          // component styles retain their original file name
          test: (file) => /\.(?:css|scss|sass|less|styl)$/.test(file),
        }),
        new UglifyJSPlugin({
          sourceMap: buildOptions.sourceMap,
          parallel: true,
          cache: true,
          uglifyOptions: {
            ecma: wco.supportES2015 ? 6 : 5,
            warnings: buildOptions.verbose,
            safari10: true,
            compress: {
              pure_getters: buildOptions.buildOptimizer,
              // PURE comments work best with 3 passes.
              // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
              passes: buildOptions.buildOptimizer ? 3 : 1,
              // Workaround known uglify-es issue
              // See https://github.com/mishoo/UglifyJS2/issues/2949#issuecomment-368070307
              inline: wco.supportES2015 ? 1 : 3,
            },
            output: {
              ascii_only: true,
              comments: false,
              webkit: true,
            },
          }
        }),
      ],
    },
    plugins: extraPlugins,
  };
}
