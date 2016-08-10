import { CliConfig } from './config';
const path = require('path')

export const getWebpackDevConfigPartial = function(projectRoot: string, sourceDir: string) {
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
      resourcePath: path.resolve(projectRoot, `./${sourceDir}`)
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
}
