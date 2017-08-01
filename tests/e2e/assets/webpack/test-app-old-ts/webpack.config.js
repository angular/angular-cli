const ngToolsWebpack = require('@ngtools/webpack');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './app/main.aot.ts',
  output: {
    path: './dist',
    publicPath: 'dist/',
    filename: 'app.main.js'
  },
  plugins: [
    new ngToolsWebpack.AotPlugin({
      tsConfigPath: './tsconfig.json'
    })
  ],
  module: {
    loaders: [
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
