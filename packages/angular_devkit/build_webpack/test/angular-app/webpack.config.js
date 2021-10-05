const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, './');
const projectRoot = path.resolve(__dirname, './');

module.exports = {
  mode: 'development',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: {
    main: path.resolve(projectRoot, './src/main.ts'),
    polyfills: path.resolve(projectRoot, './src/polyfills.ts'),
  },
  output: {
    path: path.resolve(workspaceRoot, './dist'),
    filename: `[name].js`,
  },
  plugins: [
    new ngToolsWebpack.AngularWebpackPlugin({
      tsconfig: path.resolve(projectRoot, './src/tsconfig.app.json'),
    }),
  ],
  module: {
    rules: [
      // rxjs 6 requires directory imports which are not support in ES modules.
      // Disabling `fullySpecified` allows Webpack to ignore this but this is
      // not ideal because it currently disables ESM behavior import for all JS files.
      { test: /\.[m]?js$/, resolve: { fullySpecified: false } },
      { test: /\.css$/, type: 'asset/source' },
      { test: /\.html$/, type: 'asset/source' },
      { test: /\.ts$/, loader: '@ngtools/webpack' },
    ],
  },
  devServer: {
    historyApiFallback: true,
  },
};
