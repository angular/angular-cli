var NgcWebpackPlugin = require('../lib/plugin').NgcWebpackPlugin;
var path = require('path');
module.exports = {
  resolve: {
    extensions: ['.scss', '.ts', '.js']
 //   mainFields: [ 'browser', 'module', 'main']
  },
  entry: './app/main.aot.ts',
  output: {
    path: "./dist",
    publicPath: 'dist/',
    filename: "app.main.js"
  },
  plugins: [
    new NgcWebpackPlugin({
      project: './tsconfig.json',
      baseDir: path.resolve(__dirname, '')
    }),
  ],
  module: {
    loaders: [
     {
        test: /\.ts$/,
        loader: '@angular-cli/webpack'
      }
    ]

  },
  devServer: {
    historyApiFallback: true
  }
}
