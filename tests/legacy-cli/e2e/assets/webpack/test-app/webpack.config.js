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
    new ngToolsWebpack.AngularCompilerPlugin({
      tsConfigPath: './tsconfig.json'
    })
  ],
  module: {
    rules: [
      { test: /\.scss$/, loaders: ['raw-loader', 'sass-loader'] },
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loader: 'raw-loader' },
      { test: /\.ts$/, loader: '@ngtools/webpack' }
    ]
  },
  devServer: {
    historyApiFallback: true
  }
};
