const ngToolsWebpack = require('@ngtools/webpack');

/*
  When compiling through `ngc` most options have no effect.
  only loader configuration for resources in templateUrl / styleUrls
  have effect.
 */
module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './app/main.ts',
  output: {
    path: './dist',
    publicPath: 'dist/',
    filename: 'app.main.js'
  },
  plugins: [
    new ngToolsWebpack.AngularCompilerPlugin({
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
