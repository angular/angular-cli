import * as path from 'path';
import * as webpack from 'webpack';
import {CompressionPlugin} from '../lib/webpack/compression-plugin';


export const getWebpackProdConfigPartial = function(projectRoot: string,
                                                    appConfig: any,
                                                    sourcemap: boolean,
                                                    verbose: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);

  return {
    plugins: [
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
      })
    ]
  };
};
