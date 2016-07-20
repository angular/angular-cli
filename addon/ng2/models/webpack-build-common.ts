import * as path from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as webpack from 'webpack';
import { ForkCheckerPlugin } from 'awesome-typescript-loader';
import { LoaderConfig, PathsPlugin } from '../utilities/ts-path-mappings-webpack-plugin';
import { CliConfig } from './config';

export function getWebpackCommonConfig(projectRoot: string, sourceDir: string) {
  const awesomeTypescriptLoaderConfig: LoaderConfig | any = {
    useWebpackText: true,
    useForkChecker: true,
    tsconfig: path.resolve(projectRoot, `./${sourceDir}/tsconfig.json`)
  }

  return {
    devtool: 'inline-source-map',
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: path.resolve(projectRoot, `./${sourceDir}`),
      moduleDirectories: ['node_modules'],
      plugins: [
        new PathsPlugin(awesomeTypescriptLoaderConfig);
      ]
    },
    context: path.resolve(__dirname, './'),
    entry: {
      main: [path.resolve(projectRoot, `./${sourceDir}/main.ts`)],
      polyfills: path.resolve(projectRoot, `./${sourceDir}/polyfills.ts`)
    },
    output: {
      path: path.resolve(projectRoot, './dist'),
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules/rxjs'),
            path.resolve(projectRoot, 'node_modules/@angular'),
          ]
        }
      ],
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: awesomeTypescriptLoaderConfig
            },
            {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader'},
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'postcss-loader', 'less-loader'] },
        { test: /\.scss$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000'},
        { test: /\.html$/, loader: 'raw-loader' }
      ]
    },
    plugins: [
      new ForkCheckerPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(projectRoot, `./${sourceDir}/index.html`),
        chunksSortMode: 'dependency'
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: ['polyfills']
      }),
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline',
        filename: 'inline.js',
        sourceMapFilename: 'inline.map'
      }),
      new CopyWebpackPlugin([{from: path.resolve(projectRoot, './public'), to: path.resolve(projectRoot, './dist')}])
    ],
    node: {
      global: 'window',
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  }
};
