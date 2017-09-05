import * as webpack from 'webpack';
import * as path from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { NamedLazyChunksWebpackPlugin } from '../../plugins/named-lazy-chunks-webpack-plugin';
import { InsertConcatAssetsWebpackPlugin } from '../../plugins/insert-concat-assets-webpack-plugin';
import { extraEntryParser, getOutputHashFormat, AssetPattern } from './utils';
import { isDirectory } from '../../utilities/is-directory';
import { WebpackConfigOptions } from '../webpack-config';

const ConcatPlugin = require('webpack-concat-plugin');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');


/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('url-loader')
 * require('file-loader')
 * require('@angular-devkit/build-optimizer')
 */

export function getCommonConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const nodeModules = path.resolve(projectRoot, 'node_modules');

  let extraPlugins: any[] = [];
  let extraRules: any[] = [];
  let entryPoints: { [key: string]: string[] } = {};

  if (appConfig.main) {
    entryPoints['main'] = [path.resolve(appRoot, appConfig.main)];
  }

  if (appConfig.polyfills) {
    entryPoints['polyfills'] = [path.resolve(appRoot, appConfig.polyfills)];
  }

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // process global scripts
  if (appConfig.scripts.length > 0) {
    const globalScripts = extraEntryParser(appConfig.scripts, appRoot, 'scripts');
    const globalScriptsByEntry = globalScripts
      .reduce((prev: { entry: string, paths: string[], lazy: boolean }[], curr) => {

        let existingEntry = prev.find((el) => el.entry === curr.entry);
        if (existingEntry) {
          existingEntry.paths.push(curr.path);
          // All entries have to be lazy for the bundle to be lazy.
          existingEntry.lazy = existingEntry.lazy && curr.lazy;
        } else {
          prev.push({ entry: curr.entry, paths: [curr.path], lazy: curr.lazy });
        }
        return prev;
      }, []);


    // Add a new asset for each entry.
    globalScriptsByEntry.forEach((script) => {
      const hash = hashFormat.chunk !== '' && !script.lazy ? '.[hash]' : '';
      extraPlugins.push(new ConcatPlugin({
        uglify: buildOptions.target === 'production' ? { sourceMapIncludeSources: true } : false,
        sourceMap: buildOptions.sourcemaps,
        name: script.entry,
        // Lazy scripts don't get a hash, otherwise they can't be loaded by name.
        fileName: `[name]${script.lazy ? '' : hash}.bundle.js`,
        filesToConcat: script.paths
      }));
    });

    // Insert all the assets created by ConcatPlugin in the right place in index.html.
    extraPlugins.push(new InsertConcatAssetsWebpackPlugin(
      globalScriptsByEntry
        .filter((el) => !el.lazy)
        .map((el) => el.entry)
    ));
  }

  // process asset entries
  if (appConfig.assets) {
    const copyWebpackPluginPatterns = appConfig.assets.map((asset: string | AssetPattern) => {
      // Convert all string assets to object notation.
      asset = typeof asset === 'string' ? { glob: asset } : asset;
      // Add defaults.
      // Input is always resolved relative to the appRoot.
      asset.input = path.resolve(appRoot, asset.input || '');
      asset.output = asset.output || '';
      asset.glob = asset.glob || '';

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
    const copyWebpackPluginOptions = { ignore: ['.gitkeep'] };

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
      exclude: /(\\|\/)node_modules(\\|\/)/
    }));
  }

  if (buildOptions.buildOptimizer) {
    extraRules.push({
      test: /\.js$/,
      use: [{
        loader: '@angular-devkit/build-optimizer/webpack-loader',
        options: { sourceMap: buildOptions.sourcemaps }
      }]
    });
  }

  if (buildOptions.namedChunks) {
    extraPlugins.push(new NamedLazyChunksWebpackPlugin());
  }

  return {
    resolve: {
      extensions: ['.ts', '.js'],
      modules: ['node_modules', nodeModules],
      symlinks: !buildOptions.preserveSymlinks
    },
    resolveLoader: {
      modules: [nodeModules, 'node_modules']
    },
    context: __dirname,
    entry: entryPoints,
    output: {
      path: path.resolve(buildOptions.outputPath),
      publicPath: buildOptions.deployUrl,
      filename: `[name]${hashFormat.chunk}.bundle.js`,
      chunkFilename: `[id]${hashFormat.chunk}.chunk.js`
    },
    module: {
      rules: [
        { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader', exclude: [nodeModules] },
        { test: /\.html$/, loader: 'raw-loader' },
        { test: /\.(eot|svg|cur)$/, loader: `file-loader?name=[name]${hashFormat.file}.[ext]` },
        {
          test: /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
          loader: `url-loader?name=[name]${hashFormat.file}.[ext]&limit=10000`
        }
      ].concat(extraRules)
    },
    plugins: [
      new webpack.NoEmitOnErrorsPlugin()
    ].concat(extraPlugins),
    node: {
      fs: 'empty',
      // `global` should be kept true, removing it resulted in a
      // massive size increase with Build Optimizer on AIO.
      global: true,
      crypto: 'empty',
      tls: 'empty',
      net: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
