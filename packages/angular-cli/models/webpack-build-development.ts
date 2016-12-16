const ExtractTextPlugin = require('extract-text-webpack-plugin');

export const getWebpackDevConfigPartial = function(projectRoot: string, appConfig: any) {
  return {
    output: {
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].bundle.map',
      chunkFilename: '[id].chunk.js'
    },
    plugins: [
      new ExtractTextPlugin({filename: '[name].bundle.css'})
    ]
  };
};
