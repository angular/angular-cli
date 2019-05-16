const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');


const workspaceRoot = path.resolve(__dirname, './');
const projectRoot = path.resolve(__dirname, './');

module.exports = {
  mode: 'development',
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    main: path.resolve(projectRoot, './src/main.ts'),
    polyfills: path.resolve(projectRoot, './src/polyfills.ts')
  },
  output: {
    path: path.resolve(workspaceRoot, './dist'),
    filename: `[name].js`,
  },
  plugins: [
    new ngToolsWebpack.AngularCompilerPlugin({
      tsConfigPath: path.resolve(projectRoot, './src/tsconfig.app.json')
    })
  ],
  module: {
    rules: [
      { test: /\.scss$/, loaders: ['raw-loader', 'sass-loader'] },
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loader: 'raw-loader' },
      // require.resolve is required only because of the monorepo structure here.
      { test: /\.ts$/, loader: require.resolve('@ngtools/webpack') }
    ]
  },
  devServer: {
    historyApiFallback: true
  }
};
