import * as webpack from 'webpack';
import * as path from 'path';
import { GlobCopyWebpackPlugin } from '../plugins/glob-copy-webpack-plugin';
import { SuppressEntryChunksWebpackPlugin } from '../plugins/suppress-entry-chunks-webpack-plugin';
import { packageChunkSort } from '../utilities/package-chunk-sort';
import { BaseHrefWebpackPlugin } from '@angular-cli/base-href-webpack';
import { extraEntryParser, makeCssLoaders } from './webpack-build-utils';

const autoprefixer = require('autoprefixer');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SilentError = require('silent-error');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('script-loader')
 * require('json-loader')
 * require('url-loader')
 * require('file-loader')
 */

export function getWebpackCommonConfig(
  projectRoot: string,
  environment: string,
  appConfig: any,
  baseHref: string,
  sourcemap: boolean,
  vendorChunk: boolean,
  verbose: boolean,
  progress: boolean
) {

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const appMain = path.resolve(appRoot, appConfig.main);
  const nodeModules = path.resolve(projectRoot, 'node_modules');

  let extraPlugins: any[] = [];
  let extraRules: any[] = [];
  let lazyChunks: string[] = [];

  let entryPoints: { [key: string]: string[] } = {
    main: [appMain]
  };

  // process global scripts
  if (appConfig.scripts && appConfig.scripts.length > 0) {
    const globalScripts = extraEntryParser(appConfig.scripts, appRoot, 'scripts');

    // add entry points and lazy chunks
    globalScripts.forEach(script => {
      if (script.lazy) { lazyChunks.push(script.entry); }
      entryPoints[script.entry] = (entryPoints[script.entry] || []).concat(script.path);
    });

    // load global scripts using script-loader
    extraRules.push({
      include: globalScripts.map((script) => script.path), test: /\.js$/, loader: 'script-loader'
    });
  }

  // process global styles
  if (!appConfig.styles || appConfig.styles.length === 0) {
    // create css loaders for component css
    extraRules.push(...makeCssLoaders());
  } else {
    const globalStyles = extraEntryParser(appConfig.styles, appRoot, 'styles');
    let extractedCssEntryPoints: string[] = [];
    // add entry points and lazy chunks
    globalStyles.forEach(style => {
      if (style.lazy) { lazyChunks.push(style.entry); }
      if (!entryPoints[style.entry]) {
        // since this entry point doesn't exist yet, it's going to only have
        // extracted css and we can supress the entry point
        extractedCssEntryPoints.push(style.entry);
        entryPoints[style.entry] = (entryPoints[style.entry] || []).concat(style.path);
      } else {
        // existing entry point, just push the css in
        entryPoints[style.entry].push(style.path);
      }
    });

    // create css loaders for component css and for global css
    extraRules.push(...makeCssLoaders(globalStyles.map((style) => style.path)));

    if (extractedCssEntryPoints.length > 0) {
      // don't emit the .js entry point for extracted styles
      extraPlugins.push(new SuppressEntryChunksWebpackPlugin({ chunks: extractedCssEntryPoints }));
    }
  }

  if (vendorChunk) {
    extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module: any) => module.userRequest && module.userRequest.startsWith(nodeModules)
    }));
  }

  // process environment file replacement
  if (appConfig.environments) {
    if (!('source' in appConfig.environments)) {
      throw new SilentError(`Environment configuration does not contain "source" entry.`);
    }
    if (!(environment in appConfig.environments)) {
      throw new SilentError(`Environment "${environment}" does not exist.`);
    }

    extraPlugins.push(new webpack.NormalModuleReplacementPlugin(
      // This plugin is responsible for swapping the environment files.
      // Since it takes a RegExp as first parameter, we need to escape the path.
      // See https://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
      new RegExp(path.resolve(appRoot, appConfig.environments['source'])
        .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')),
      path.resolve(appRoot, appConfig.environments[environment])
    ));
  }

  // process asset entries
  if (appConfig.assets) {
    extraPlugins.push(new GlobCopyWebpackPlugin({
      patterns: appConfig.assets,
      globOptions: { cwd: appRoot, dot: true, ignore: '**/.gitkeep' }
    }));
  }

  if (progress) { extraPlugins.push(new ProgressPlugin({ profile: verbose, colors: true })); }

  return {
    devtool: sourcemap ? 'source-map' : false,
    performance: { hints: false },
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [nodeModules],
    },
    resolveLoader: {
      modules: [nodeModules]
    },
    context: projectRoot,
    entry: entryPoints,
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      publicPath: appConfig.deployUrl
    },
    module: {
      rules: [
        { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader', exclude: [nodeModules] },

        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.(jpg|png|gif)$/, loader: 'url-loader?limit=10000' },
        { test: /\.html$/, loader: 'raw-loader' },

        { test: /\.(otf|ttf|woff|woff2)$/, loader: 'url-loader?limit=10000' },
        { test: /\.(eot|svg)$/, loader: 'file-loader' }
      ].concat(extraRules)
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appRoot, appConfig.index),
        filename: path.resolve(appConfig.outDir, appConfig.index),
        chunksSortMode: packageChunkSort(['inline', 'styles', 'scripts', 'vendor', 'main']),
        excludeChunks: lazyChunks,
        xhtml: true
      }),
      new BaseHrefWebpackPlugin({
        baseHref: baseHref
      }),
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline'
      }),
      new webpack.LoaderOptionsPlugin({
        test: /\.(css|scss|sass|less|styl)$/,
        options: {
          postcss: [autoprefixer()],
          cssLoader: { sourceMap: sourcemap },
          sassLoader: { sourceMap: sourcemap },
          lessLoader: { sourceMap: sourcemap },
          stylusLoader: { sourceMap: sourcemap },
          // context needed as a workaround https://github.com/jtangelder/sass-loader/issues/285
          context: projectRoot,
        },
      })
    ].concat(extraPlugins),
    node: {
      fs: 'empty',
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
