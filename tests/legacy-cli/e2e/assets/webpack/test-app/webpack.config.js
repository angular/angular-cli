const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: './app/main.ts',
  output: {
    path: path.resolve('./dist'),
    publicPath: 'dist/',
    filename: 'app.main.js',
  },
  plugins: [new ngToolsWebpack.AngularWebpackPlugin()],
  module: {
    rules: [
      { test: /\.scss$/, use: ['sass-loader'], type: 'asset/source' },
      { test: /\.html$/, type: 'asset/source' },
      { test: /\.ts$/, loader: ngToolsWebpack.AngularWebpackLoaderPath },
    ],
  },
  devServer: {
    historyApiFallback: true,
  },
};
