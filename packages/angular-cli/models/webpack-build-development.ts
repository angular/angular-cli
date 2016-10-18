const path = require('path');

import * as webpack from 'webpack';

export const getWebpackDevConfigPartial = function(projectRoot: string, appConfig: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);
  const sass = appConfig.sassPaths
             ? appConfig.sassPaths.map((includePath: string) => path.resolve(appRoot, includePath))
             : [];
  return {
    devtool: 'cheap-module-source-map',
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].map',
      chunkFilename: '[id].chunk.js'
    },
    plugins: [
      new webpack.LoaderOptionsPlugin({
        options: {
          sassLoader: {
            includePaths: sass
          }
        }
      })
    ],
    node: {
      fs: 'empty',
      global: true,
      crypto: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
};
