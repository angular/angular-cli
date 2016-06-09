import * as path from 'path';
import * as webpack from 'webpack';
const webpackMerge = require('webpack-merge');
const CompressionPlugin = require('compression-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

export function getWebpackNodeConfig(projectRoot: string, environment: string, appConfig: any) {
  const checkNodeImport = function (context: any, request: any, cb: any) {
    if (!path.isAbsolute(request) && request.charAt(0) !== '.') {
      cb(null, 'commonjs ' + request);
      return;
    }
    cb();
  };
  const appRoot = path.resolve(projectRoot, appConfig.root);
  const nodeMain = path.resolve(appRoot, appConfig.nodeMain);
  const styles = appConfig.styles
    ? appConfig.styles.map((style: string) => path.resolve(appRoot, style))
    : [];
  const scripts = appConfig.scripts
    ? appConfig.scripts.map((script: string) => path.resolve(appRoot, script))
    : [];
  const entryName: string = path.basename(nodeMain).replace('.ts', '');
  let entry: { [key: string]: string[] } = {};
  entry[entryName] = [nodeMain];

  const commonConfig: any = {
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [path.resolve(projectRoot, 'node_modules')]
    },
    context: path.resolve(__dirname, './'),
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            /node_modules/
          ]
        },
        {
          test: /\.ts$/,
          loaders: [{
            loader: 'awesome-typescript-loader',
            query: {
              useForkChecker: true,
              tsconfig: path.resolve(appRoot, appConfig.tsconfig)
            }
          }, {
            loader: 'angular2-template-loader'
          }],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        // in main, load css as raw text
        {
          exclude: styles,
          test: /\.css$/,
          loaders: ['raw-loader', 'postcss-loader']
        }, {
          exclude: styles,
          test: /\.styl$/,
          loaders: ['raw-loader', 'postcss-loader', 'stylus-loader']
        },
        {
          exclude: styles,
          test: /\.less$/,
          loaders: ['raw-loader', 'postcss-loader', 'less-loader']
        }, {
          exclude: styles,
          test: /\.scss$|\.sass$/,
          loaders: ['raw-loader', 'postcss-loader', 'sass-loader']
        },


        // load global scripts using script-loader
        {include: scripts, test: /\.js$/, loader: 'script-loader'},

        {test: /\.json$/, loader: 'json-loader'},
        {test: /\.(jpg|png|gif)$/, loader: 'url-loader?limit=10000'},
        {test: /\.html$/, loader: 'raw-loader'},

        {test: /\.(otf|ttf|woff|woff2)$/, loader: 'url?limit=10000'},
        {test: /\.(eot|svg)$/, loader: 'file'}
      ]
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
    ],
    entry: entry,
    target: 'node',
    externals: checkNodeImport,
    node: {
      global: true,
      __dirname: false,
      __filename: true,
      process: true,
      Buffer: true
    }
  };
  const devConfig: any = {
    devtool: 'inline-source-map',
    module: {
      rules: [
        // outside of main, load it via style-loader for development builds
        {
          include: styles,
          test: /\.css$/,
          loaders: [
            'style-loader',
            'css-loader?sourcemap',
            'postcss-loader'
          ]
        }, {
          include: styles,
          test: /\.styl$/,
          loaders: [
            'style-loader',
            'css-loader?sourcemap',
            'postcss-loader',
            'stylus-loader?sourcemap'
          ]
        }, {
          include: styles,
          test: /\.less$/,
          loaders: [
            'style-loader',
            'css-loader?sourcemap',
            'postcss-loader',
            'less-loader?sourcemap'
          ]
        }, {
          include: styles,
          test: /\.scss$|\.sass$/,
          loaders: [
            'style-loader',
            'css-loader?sourcemap',
            'postcss-loader',
            'sass-loader?sourcemap'
          ]
        },
      ]
    }
  };
  const prodConfig: any = {
    devtool: 'source-map',
    module: {
      rules: [
        // outside of main, load it via extract-text-plugin for production builds
        {
          include: styles,
          test: /\.css$/,
          loaders: ExtractTextPlugin.extract([
            'css-loader?sourcemap&minimize', 'postcss-loader'
          ])
        }, {
          include: styles,
          test: /\.styl$/,
          loaders: ExtractTextPlugin.extract([
            'css-loader?sourcemap&minimize', 'postcss-loader', 'stylus-loader?sourcemap'
          ])
        }, {
          include: styles,
          test: /\.less$/,
          loaders: ExtractTextPlugin.extract([
            'css-loader?sourcemap&minimize', 'postcss-loader', 'less-loader?sourcemap'
          ])
        }, {
          include: styles,
          test: /\.scss$|\.sass$/,
          loaders: ExtractTextPlugin.extract([
            'css-loader?sourcemap&minimize', 'postcss-loader', 'sass-loader?sourcemap'
          ])
        },
      ]
    },
    plugins: [
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
      })
    ]
  };

  if (environment === 'prod') {
    return webpackMerge(commonConfig, prodConfig);
  } else {
    return webpackMerge(commonConfig, devConfig);
  }
}
