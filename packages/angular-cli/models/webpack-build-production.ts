import * as path from 'path';
import {CompressionPlugin} from '../lib/webpack/compression-plugin';

const WebpackMd5Hash = require('webpack-md5-hash');
import * as webpack from 'webpack';
const ExtractTextPlugin = require('extract-text-webpack-plugin');

declare module 'webpack' {
  export interface LoaderOptionsPlugin {}
  export interface LoaderOptionsPluginStatic {
    new (optionsObject: any): LoaderOptionsPlugin;
  }
  interface Webpack {
    LoaderOptionsPlugin: LoaderOptionsPluginStatic;
  }
}

export const getWebpackProdConfigPartial = function(projectRoot: string,
                                                    appConfig: any,
                                                    verbose: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);
  const styles = appConfig.styles
               ? appConfig.styles.map((style: string) => path.resolve(appRoot, style))
               : [];
  const cssLoaders = ['css-loader?sourcemap&minimize', 'postcss-loader'];

  return {
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].[chunkhash].bundle.js',
      sourceMapFilename: '[name].[chunkhash].bundle.map',
      chunkFilename: '[id].[chunkhash].chunk.js'
    },
    module: {
      rules: [
        // outside of main, load it via extract-text-plugin for production builds
        {
          include: styles,
          test: /\.css$/,
          loaders: ExtractTextPlugin.extract(cssLoaders)
        }, {
          include: styles,
          test: /\.styl$/,
          loaders: ExtractTextPlugin.extract([...cssLoaders, 'stylus-loader?sourcemap'])
        }, {
          include: styles,
          test: /\.less$/,
          loaders: ExtractTextPlugin.extract([...cssLoaders, 'less-loader?sourcemap'])
        }, {
          include: styles,
          test: /\.scss$|\.sass$/,
          loaders: ExtractTextPlugin.extract([...cssLoaders, 'sass-loader?sourcemap'])
        },
      ]
    },
    plugins: [
      new ExtractTextPlugin('[name].[contenthash].bundle.css'),
      new WebpackMd5Hash(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8 : true },
        compress: { screw_ie8: true, warnings: verbose },
        sourceMap: true
      }),
      new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /\.js$|\.html$|\.css$/,
          threshold: 10240
      }),
      new webpack.LoaderOptionsPlugin({
        options: {
          postcss: [
            require('postcss-discard-comments')
          ]
        }
      })
    ]
  };
};
