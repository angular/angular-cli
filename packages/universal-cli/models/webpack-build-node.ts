import * as path from 'path';
import * as webpack from 'webpack';
import { CompressionPlugin } from '../lib/webpack/compression-plugin';
import { SuppressEntryChunksWebpackPlugin } from '../plugins/suppress-entry-chunks-webpack-plugin';
import { extraEntryParser, makeCssLoaders } from './webpack-build-utils';

const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const autoprefixer = require('autoprefixer');
const postcssDiscardComments = require('postcss-discard-comments');

export function getWebpackNodeConfig(
  projectRoot: string,
  environment: string,
  appConfig: any,
  baseHref: string,
  sourcemap: boolean,
  verbose: boolean,
  progress: boolean
) {
  const checkNodeImport = function (context: any, request: any, cb: any) {
    if (!path.isAbsolute(request) && request.charAt(0) !== '.') {
      cb(null, 'commonjs ' + request);
      return;
    }
    cb();
  };
  const appRoot = path.resolve(projectRoot, appConfig.root);
  const nodeMain = path.resolve(appRoot, appConfig.nodeMain);
  const nodeModules = path.resolve(projectRoot, 'node_modules');
  const entryName: string = path.basename(nodeMain).replace('.ts', '');

  let extraPlugins: any[] = [];
  let extraRules: any[] = [];
  let lazyChunks: string[] = [];

  let entryPoints: { [key: string]: string[] } = {};
  entryPoints[entryName] = [nodeMain];

  // process global scripts
  if (appConfig.scripts.length > 0) {
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
  if (appConfig.styles.length === 0) {
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

  if (progress) { extraPlugins.push(new ProgressPlugin({ profile: verbose, colors: true })); }

  const commonConfig: any = {
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [nodeModules]
    },
    resolveLoader: {
      modules: [nodeModules]
    },
    context: projectRoot,
    entry: entryPoints,
    output: {
      path: path.resolve(projectRoot, appConfig.outDir, '../server'),
      filename: '[name].bundle.js',
      libraryTarget: 'commonjs2'
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
      new webpack.ContextReplacementPlugin(
        // The (\\|\/) piece accounts for path separators in *nix and Windows
        /angular(\\|\/)core(\\|\/)src(\\|\/)linker/,
        path.resolve(__dirname, './src'),
        {}
      ),
      new webpack.NormalModuleReplacementPlugin(
        // This plugin is responsible for swapping the environment files.
        // Since it takes a RegExp as first parameter, we need to escape the path.
        // See https://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
        new RegExp(path.resolve(appRoot, appConfig.environments['source'])
          .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')),
        path.resolve(appRoot, appConfig.environments[environment])
      ),
    ].concat(extraPlugins),
    target: 'node',
    externals: checkNodeImport,
    node: {
      global: true,
      crypto: true,
      __dirname: false,
      __filename: true,
      process: true,
      Buffer: true
    }
  };
  const devConfig: any = {
    devtool: 'inline-source-map',
    plugins: [
      new ExtractTextPlugin({filename: '[name].bundle.css'}),
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
    ]
  };
  const prodConfig: any = {
    devtool: 'source-map',
    plugins: [
      new ExtractTextPlugin('[name].[chunkhash].bundle.css'),
      new webpack.LoaderOptionsPlugin({ minimize: true }),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: {screw_ie8: true},
        compress: {screw_ie8: true},
        sourceMap: true
      }),
      new CompressionPlugin({
        asset: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.js$|\.html$/,
        threshold: 10240,
        minRatio: 0.8
      }),
      // LoaderOptionsPlugin needs to be fully duplicated because webpackMerge will replace it.
      new webpack.LoaderOptionsPlugin({
        test: /\.(css|scss|sass|less|styl)$/,
        options: {
          postcss: [
            autoprefixer(),
            postcssDiscardComments
          ],
          cssLoader: { sourceMap: sourcemap },
          sassLoader: { sourceMap: sourcemap },
          lessLoader: { sourceMap: sourcemap },
          stylusLoader: { sourceMap: sourcemap },
          // context needed as a workaround https://github.com/jtangelder/sass-loader/issues/285
          context: projectRoot,
        }
      })
    ]
  };

  if (environment === 'prod') {
    return webpackMerge(commonConfig, prodConfig);
  } else {
    return webpackMerge(commonConfig, devConfig);
  }
}
