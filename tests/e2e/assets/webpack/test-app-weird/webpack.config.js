const ngToolsWebpack = require('@ngtools/webpack');

const flags = require('./webpack.flags.json');

const preprocessLoader = 'preprocess-loader' + (flags.DEBUG ? '?+DEBUG' : '');


module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './not/so/source/app/main.jit.ts',
  output: {
    path: './dist',
    publicPath: 'dist/',
    filename: 'app.main.js'
  },
  plugins: [
    new ngToolsWebpack.AotPlugin(require('./aotplugin.config.json'))
  ],
  module: {
    loaders: [
      { test: /\.scss$/, loaders: ['raw-loader', 'sass-loader', preprocessLoader] },
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loaders: ['raw-loader', preprocessLoader] },
      // Use preprocess to remove DEBUG only code.
      { test: /\.ts$/, use: [
        { loader: '@ngtools/webpack' },
        { loader: preprocessLoader }
      ] }
    ]
  },
  devServer: {
    historyApiFallback: true
  }
};
