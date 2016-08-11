import * as path from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as webpack from 'webpack';
import * as atl from 'awesome-typescript-loader';
import { CliConfig } from './config';

import {SystemJSRegisterPublicModules} from './webpack-plugin-systemjs-registry';
import {findLazyModules} from './find-lazy-modules';

export function getWebpackCommonConfig(projectRoot: string, sourceDir: string) {
  let outputPath: string = path.resolve(projectRoot, outputDir);

  return {
    devtool: 'source-map',
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: path.resolve(projectRoot, `./${sourceDir}`)
    },
    context: path.resolve(__dirname, './'),
    entry: entries,
    output: {
      path: outputPath,
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            /node_modules/
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
      new atl.ForkCheckerPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(projectRoot, `./${sourceDir}/index.html`),
        chunksSortMode: 'dependency'
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'polyfills'
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
      // new SystemJSRegisterPublicModules({
      //   // automatically configure SystemJS to load webpack chunks (defaults to true)
      //   bundlesConfigForChunks: true,
      //
      //   // select which modules to expose as public modules
      //   registerModules: [
      //     // "default" filters provided are "local" and "public"
      //     { filter: 'public' },
      //     //
      //     // // keyname allows a custom naming system for public modules
      //     // {
      //     //   filter: 'local',
      //     //   keyname: 'app/[relPath]'
      //     // },
      //     //
      //     // // keyname can be a function
      //     // {
      //     //   filter: 'public',
      //     //   keyname: (module) => 'publicModule-' + module.id
      //     // },
      //     //
      //     // // filter can also be a function
      //     // {
      //     //   filter: (m) => m.relPath.match(/src/),
      //     //   keyname: 'random-naming-system-[id]'
      //     // }
      //   ]
      // })
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
