// this config must be JS so that the karma plugin can load it

const path = require('path');
const webpack = require('webpack');

const getWebpackTestConfig = function(projectRoot, sourceDir) {
  return {
    devtool: 'inline-source-map',
    context: path.resolve(__dirname, './'),
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: path.resolve(projectRoot, `./${sourceDir}`)
    },
    entry: {
      test: path.resolve(projectRoot, `./${sourceDir}/test.ts`)
    },
    output: {
      path: './dist.test',
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.ts$/,
          loader: 'tslint-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules')
          ]
        },
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules/rxjs'),
            path.resolve(projectRoot, 'node_modules/@angular')
          ]
        }
      ],
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: {
                tsconfig: path.resolve(projectRoot, `./${sourceDir}/tsconfig.json`),
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
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'postcss-loader', 'less-loader'] },
        { test: /\.scss$|\.sass$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000' },
        { test: /\.html$/, loader: 'raw-loader', exclude: [path.resolve(projectRoot, `./${sourceDir}/index.html`)] }
      ],
      postLoaders: [
        {
          test: /\.(js|ts)$/, loader: 'sourcemap-istanbul-instrumenter-loader',
          exclude: [
            /\.(e2e|spec)\.ts$/,
            /node_modules/
          ],
          query: { 'force-sourcemap': true }
        }
      ]
    },
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        filename: null, // if no value is provided the sourcemap is inlined
        test: /\.(ts|js)($|\?)/i // process .js and .ts files only
      })
    ],
    tslint: {
      emitErrors: false,
      failOnHint: false,
      resourcePath: `./${sourceDir}`
    },
    node: {
      fs: 'empty',
      global: 'window',
      process: false,
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}

module.exports.getWebpackTestConfig = getWebpackTestConfig;
