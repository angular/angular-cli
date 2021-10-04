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
      // rxjs 6 requires directory imports which are not support in ES modules.
      // Disabling `fullySpecified` allows Webpack to ignore this but this is
      // not ideal because it currently disables ESM behavior import for all JS files.
      { test: /\.[m]?js$/, resolve: { fullySpecified: false } },
      { test: /\.scss$/, use: ['sass-loader'], type: 'asset/source' },
      { test: /\.html$/, type: 'asset/source' },
      { test: /\.ts$/, loader: ngToolsWebpack.AngularWebpackLoaderPath },
    ],
  },
  devServer: {
    historyApiFallback: true,
  },
};
