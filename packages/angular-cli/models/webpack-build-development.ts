const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

export const getWebpackDevConfigPartial = function(projectRoot: string, appConfig: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);

  return {
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].bundle.map',
      chunkFilename: '[id].chunk.js'
    },
    plugins: [
      new ExtractTextPlugin({filename: '[name].bundle.css'})
    ]
  };
};
