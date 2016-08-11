import * as path from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as webpack from 'webpack';
import * as atl from 'awesome-typescript-loader';
import { CliConfig } from './config';

import {findLazyModules} from './find-lazy-modules';

export function getWebpackCommonConfig(projectRoot: string, sourceDir: string) {
  const sourceRoot = path.resolve(projectRoot, `./${sourceDir}`);

  let outputPath: string = path.resolve(projectRoot, outputDir);
  const lazyModules = findLazyModules(path.resolve(projectRoot, sourceDir));

  return {
    devtool: 'source-map',
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: path.resolve(projectRoot, `./${sourceDir}`)
    },
    context: path.resolve(__dirname, './'),
    entry: {
      main: [path.join(sourceRoot, 'main.ts')],
      polyfills: path.join(sourceRoot, 'polyfills.ts')
    },
    output: {
      path: outputPath,
      filename: '[name].bundle.js'
    },
    module: {
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: {
                useForkChecker: true,
                tsconfig: path.resolve(projectRoot, `./${sourceDir}/tsconfig.json`)
              }
            }, {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader'},
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'postcss-loader', 'less-loader'] },
        { test: /\.scss$|\.sass$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000'},
        { test: /\.html$/, loader: 'raw-loader' }
      ]
    },
    plugins: [
      new webpack.ContextReplacementPlugin(/.*/, sourceRoot, lazyModules),
      new atl.ForkCheckerPlugin(),
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
      new CopyWebpackPlugin([{
        context: path.resolve(projectRoot, './public'),
        from: '**/*',
        to: outputPath
      }]),
    ],
    node: {
      fs: 'empty',
      global: 'window',
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  }
}
