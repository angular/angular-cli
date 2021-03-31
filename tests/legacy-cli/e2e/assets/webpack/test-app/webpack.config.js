const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './app/main.ts',
  output: {
    path: path.resolve('./dist'),
    publicPath: 'dist/',
    filename: 'app.main.js'
  },
  plugins: [
    new ngToolsWebpack.ivy.AngularWebpackPlugin(),
  ],
  module: {
    rules: [
      { test: /\.scss$/, use: ['raw-loader', 'sass-loader'] },
      { test: /\.html$/, loader: 'raw-loader' },
      { test: /\.ts$/, loader: ngToolsWebpack.ivy.AngularWebpackLoaderPath }
    ]
  },
  devServer: {
    historyApiFallback: true
  }
};
