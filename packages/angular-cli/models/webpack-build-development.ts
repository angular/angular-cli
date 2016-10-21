const path = require('path');

export const getWebpackDevConfigPartial = function(projectRoot: string, appConfig: any) {
  return {
    devtool: 'cheap-module-source-map',
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].map',
      chunkFilename: '[id].chunk.js'
    }
  };
};
