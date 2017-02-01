import * as path from 'path';
import * as webpack from 'webpack';
import { CompressionPlugin } from '../../lib/webpack/compression-plugin';
import { WebpackConfigOptions } from '../webpack-config';


export const getProdConfig = function (wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;
  const appRoot = path.resolve(projectRoot, appConfig.root);

  return {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8: true },
        compress: { screw_ie8: true, warnings: buildOptions.verbose },
        sourceMap: buildOptions.sourcemap
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
