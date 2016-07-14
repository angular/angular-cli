const path = require('path')

export const getWebpackDevConfigPartial = function(projectRoot: string) {
  return {
    debug: true,
    devtool: 'cheap-module-source-map',
    output: {
      path: path.resolve(projectRoot, './dist'),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].map',
      chunkFilename: '[id].chunk.js'
    },
    tslint: {
      emitErrors: false,
      failOnHint: false,
      resourcePath: path.resolve(projectRoot, './src')
    },
    node: {
      global: 'window',
      crypto: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
