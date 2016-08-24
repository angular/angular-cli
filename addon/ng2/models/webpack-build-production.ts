import * as path from 'path';
import * as WebpackMd5Hash from 'webpack-md5-hash';
import * as CompressionPlugin from 'compression-webpack-plugin';
import * as webpack from 'webpack';

export const getWebpackProdConfigPartial = function(projectRoot: string, appConfig: any) {
  return {
    debug: false,
    devtool: 'source-map',
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].[chunkhash].bundle.js',
      sourceMapFilename: '[name].[chunkhash].bundle.map',
      chunkFilename: '[id].[chunkhash].chunk.js'
    },
    plugins: [
      new WebpackMd5Hash(),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        mangle: { screw_ie8 : true, keep_fnames: true },
        compress: { screw_ie8: true },
        comments: false
      }),
      new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /\.js$|\.html$/,
          threshold: 10240,
          minRatio: 0.8
      })
    ],
    tslint: {
      emitErrors: true,
      failOnHint: true,
      resourcePath: path.resolve(projectRoot, appConfig.root)
    },
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
    node: {
      fs: 'empty',
      global: 'window',
      crypto: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
};
