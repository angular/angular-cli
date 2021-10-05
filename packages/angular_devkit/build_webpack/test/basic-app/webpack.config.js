const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, './src/main.js'),
  module: {
    rules: [
      // rxjs 6 requires directory imports which are not support in ES modules.
      // Disabling `fullySpecified` allows Webpack to ignore this but this is
      // not ideal because it currently disables ESM behavior import for all JS files.
      { test: /\.[m]?js$/, resolve: { fullySpecified: false } },
    ],
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
  },
};
