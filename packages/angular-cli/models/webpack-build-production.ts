import * as path from 'path';
import * as webpack from 'webpack';
const ExtractTextPlugin = require('extract-text-webpack-plugin');
import {CompressionPlugin} from '../lib/webpack/compression-plugin';
const autoprefixer = require('autoprefixer');
const postcssDiscardComments = require('postcss-discard-comments');

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
                                                    sourcemap: boolean,
                                                    verbose: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);

  return {
    output: {
      filename: '[name].[chunkhash].bundle.js',
      sourceMapFilename: '[name].[chunkhash].bundle.map',
      chunkFilename: '[id].[chunkhash].chunk.js'
    },
    plugins: [
      new ExtractTextPlugin('[name].[chunkhash].bundle.css'),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.LoaderOptionsPlugin({ minimize: true }),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8 : true },
        compress: { screw_ie8: true, warnings: verbose },
        sourceMap: sourcemap
      }),
      new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /\.js$|\.html$|\.css$/,
          threshold: 10240
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
};
