import * as webpack from 'webpack';
import * as path from 'path';
import { GlobCopyWebpackPlugin } from '../../plugins/glob-copy-webpack-plugin';
import { NamedLazyChunksWebpackPlugin } from '../../plugins/named-lazy-chunks-webpack-plugin';
import { extraEntryParser, getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../webpack-config';

const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');


/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('script-loader')
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

    // add entry points and lazy chunks
    globalScripts.forEach(script => {
      let scriptPath = `script-loader!${script.path}`;
      entryPoints[script.entry] = (entryPoints[script.entry] || []).concat(scriptPath);
    });
  }

  // process asset entries
  if (appConfig.assets) {
    extraPlugins.push(new GlobCopyWebpackPlugin({
      patterns: appConfig.assets,
      globOptions: { cwd: appRoot, dot: true, ignore: '**/.gitkeep' }
    }));
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
