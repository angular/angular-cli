// this config must be JS so that the karma plugin can load it

const path = require('path');
const webpack = require('webpack');
const atl = require('awesome-typescript-loader');

const getWebpackTestConfig = function (projectRoot, environment, appConfig, testConfig) {

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const extraRules = [];
  const extraPlugins = [];

  if (testConfig.codeCoverage) {
    extraRules.push({
      test: /\.(js|ts)$/, loader: 'sourcemap-istanbul-instrumenter-loader',
      enforce: 'post',
      exclude: [
        /\.(e2e|spec)\.ts$/,
        /node_modules/
      ],
      query: { 'force-sourcemap': true }
    });
  }

  if (testConfig.lint) {
    extraRules.push({
      test: /\.ts$/,
      enforce: 'pre',
      loader: 'tslint-loader',
      exclude: [
        path.resolve(projectRoot, 'node_modules')
      ]
    });
    extraPlugins.push(new webpack.LoaderOptionsPlugin({
      options: {
        tslint: {
          emitErrors: false,
          failOnHint: false,
          resourcePath: `./${appConfig.root}`
        }
      }
    }))
  }

  return {
    devtool: 'inline-source-map',
    context: path.resolve(__dirname, './'),
    resolve: {
      extensions: ['.ts', '.js'],
      plugins: [
        new atl.TsConfigPathsPlugin({
          tsconfig: path.resolve(appRoot, appConfig.tsconfig)
        })
      ]
    },
    entry: {
      test: path.resolve(appRoot, appConfig.test)
    },
    output: {
      path: './dist.test',
      filename: '[name].bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          loader: 'source-map-loader',
          exclude: [
            /node_modules/
          ]
        },
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: {
                tsconfig: path.resolve(appRoot, appConfig.tsconfig),
                module: 'commonjs',
                target: 'es5',
                useForkChecker: true
              }
            },
            {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.e2e\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.css$/, loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'postcss-loader', 'less-loader'] },
        { test: /\.scss$|\.sass$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000' },
        { test: /\.html$/, loader: 'raw-loader', exclude: [path.resolve(appRoot, appConfig.index)] }
      ].concat(extraRules)
    },
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        filename: null, // if no value is provided the sourcemap is inlined
        test: /\.(ts|js)($|\?)/i // process .js and .ts files only
      }),
      new webpack.NormalModuleReplacementPlugin(
        // This plugin is responsible for swapping the environment files.
        // Since it takes a RegExp as first parameter, we need to escape the path.
        // See https://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
        new RegExp(path.resolve(appRoot, appConfig.environments['source'])
          .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')),
        path.resolve(appRoot, appConfig.environments[environment])
      ),
      new webpack.ContextReplacementPlugin(
        /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
        appRoot
      )
    ].concat(extraPlugins),
    node: {
      fs: 'empty',
      global: true,
      crypto: 'empty',
      tls: 'empty',
      net: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}

module.exports.getWebpackTestConfig = getWebpackTestConfig;
