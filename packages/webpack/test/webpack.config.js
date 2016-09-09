var NgcWebpackPlugin = require('@angular-cli/webpack').NgcWebpackPlugin;
var path = require('path');

module.exports = {
  resolve: {
    extensions: ['', '.scss', '.ts', '.js'],
 //   mainFields: [ 'browser', 'module', 'main']
  },
  entry: './app/app.module.ts',
  output: {
    path: "./dist",
    publicPath: 'dist/',
    filename: "app.js"
  },
  plugins: [
    new NgcWebpackPlugin({
      project: './tsconfig.json',
      appRoot: path.resolve(__dirname, 'app'),
      entryModule: './app.module#AppModule'
    })
  ],
  module: {
    loaders: [
     {
        test: /\.ts$/,
        loader: '@angular-cli/webpack'
      }
    ]

  },
  ngc: {
    compilerMode: 'jit',
    'main.jit': './app/main.jit.ts',
    'main.aot': './app/main.aot.ts',
    'main.module': './app/app.module.ts'
  }
}
