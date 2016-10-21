import * as path from 'path';
const WebpackMd5Hash = require('webpack-md5-hash');
const CompressionPlugin = require('compression-webpack-plugin');
import * as webpack from 'webpack';

declare module 'webpack' {
  export interface LoaderOptionsPlugin {}
  export interface LoaderOptionsPluginStatic {
    new (optionsObject: any): LoaderOptionsPlugin;
  }
  interface Webpack {
    LoaderOptionsPlugin: LoaderOptionsPluginStatic;
  }
}

export const getWebpackProdConfigPartial = function(projectRoot: string, appConfig: any) {
  return {
    devtool: 'source-map',
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].[chunkhash].bundle.js',
      sourceMapFilename: '[name].[chunkhash].bundle.map',
      chunkFilename: '[id].[chunkhash].chunk.js'
    },
    plugins: [
      new WebpackMd5Hash(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8 : true },
        compress: { screw_ie8: true },
        sourceMap: true
      }),
      new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /\.js$|\.html$/,
          threshold: 10240,
          minRatio: 0.8
      }),
      new webpack.LoaderOptionsPlugin({
        options: {
          htmlLoader: {
            minimize: true,
            removeAttributeQuotes: false,
            caseSensitive: true,
            customAttrSurround: [
              [/#/, /(?:)/],
              [/\*/, /(?:)/],
              [/\[?\(?/, /(?:)/]
            ],
            customAttrAssign: [/\)?\]?=/]
          },
          postcss: [
            require('postcss-discard-comments')
          ]
        }
      })
    ]
  };
};
