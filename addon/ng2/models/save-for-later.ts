
// new webpack.LoaderOptionsPlugin({
//   minimize: true
// }),
// new webpack.LoaderOptionsPlugin({
//   test: /\.js$/,
//   jsfile: true
// })
// new ClosureCompilerPlugin({
//   compiler: {
//     language_in: 'ECMASCRIPT5',
//     language_out: 'ECMASCRIPT5',
//     compilation_level: 'SIMPLE'
//   },
//   concurrency: 3,
// })




// ts: {
//   configFileName: ngAppResolve('./src/tsconfig.json'),
//   silent: true
// },
// output: {
//   path: './dist/',
//   filename: '[name].[chunkhash].js',
//   sourceMapFilename: '[name].[chunkhash].map',
//   chunkFilename: '[chunkhash].js'
// },
// recordsPath: path.join(__dirname, "records.json"),
//
//
//
//
// new webpack.optimize.CommonsChunkPlugin({
//   names: ['main', 'vendors', 'polyfills']
// }),
// new webpack.optimize.CommonsChunkPlugin({
//   minChunks: Infinity,
//   name: 'inline',
//   filename: 'inline.js',
//   sourceMapFilename: 'inline.map'
// }),
// new HtmlWebpackPlugin({
//   template:'./src/index.html',
//   chunksSortMode: "dependency"
// })
//
//
// export const materialEntryConfig: {[key: string]: any} = {
//   demoMain: [ngAppResolve('./src/demo-app/main.ts')],
//   e2eMain: [ngAppResolve('./src/e2e-app/main.ts')],
//   core: [ngAppResolve('./src/core/core.ts')],
//   vendor: [
//     "@angular/common",
//     "@angular/compiler",
//     "@angular/core",
//     "@angular/http",
//     "@angular/platform-browser",
//     "@angular/platform-browser-dynamic",
//     "@angular/router",
//   ],
//   polyfills: [
//     "core-js",
//     "hammerjs",
//     "rxjs",
//     "systemjs",
//     "zone.js"
//   ]
// }

// export const materialPluginsConfig: any[] = [
//     new webpack.optimize.CommonsChunkPlugin({
//       name: ['polyfills', 'vendor'].reverse()
//     }),
//     new HtmlWebpackPlugin({
//       template: ngAppResolve('./demo-app/index.html'),
//       chunksSortMode: 'dependency'
//     })
// ];
//
//
//
//
//
// const webpack = require('webpack');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
// const path = require('path');
// const ClosureCompilerPlugin = require('webpack-closure-compiler');
// const autoprefixer = require('autoprefixer');
// const cssnano = require('cssnano');
// const ForkCheckerPlugin = require('awesome-typescript-loader').ForkCheckerPlugin;
// // Resolve to the generated applications




// let baseHtmlTemplateConfig = {
//   template: ngAppResolve('./src/index.html'),
//   chunksSortMode: 'dependency'
// };
// // These are the output
// const webpackTestPartial = {
//   module: {
//     plugins: [
//       new ForkCheckerPlugin(),
//       new HtmlWebpackPlugin(baseHtmlTemplateConfig),
//     ],
//     preLoaders: [
//       {
//         test: /\.ts$/,
//         loader: 'tslint-loader',
//         exclude: ['node_modules']
//       },
//       {
//         test: /\.js$/,
//         loader: 'source-map-loader',
//         exclude: [
//         // these packages have problems with their sourcemaps
//         ngAppResolve('node_modules/rxjs'),
//         ngAppResolve('node_modules/@angular')
//       ]}
//     ],
//     loaders: [
//       {
//         test: /\.ts$/,
//         loaders: [
//           {
//             loader: 'awesome-typescript-loader',
//             query: {
//               useWebpackText: true,
//               tsconfig: ngAppResolve('./src/tsconfig.json'),
//               resolveGlobs: false,
//               module: "es2015",
//               target: "es5",
//               library: 'es6',
//               useForkChecker: true,
//               removeComments: true
//             }
//           },
//           {
//             loader: 'angular2-template-loader'
//           }
//         ],
//         exclude: [/\.(spec|e2e)\.ts$/]
//       },
//       { test: /\.json$/, loader: 'json-loader', exclude: [ngAppResolve('src/index.html')] },
//       { test: /\.css$/, loader: 'raw-loader', exclude: [ngAppResolve('src/index.html')] },
//       { test: /\.html$/, loader: 'raw-loader', exclude: [ngAppResolve('src/index.html')] }
//     ]
//   },
//   tslint: {
//     emitErrors: false,
//     failOnHint: false,
//     resourcePath: 'src'
//   },
//   node: {
//     global: 'window',
//     process: false,
//     crypto: 'empty',
//     module: false,
//     clearImmediate: false,
//     setImmediate: false
//   }
// };

// Webpack Configuration Object
// Used in build.ts

// var webpack = require('webpack');
// var path = require('path');


// // Webpack Config
// var webpackConfig = {
//   devtool: "#source-map",
//   entry: {
//     'angular2polyfills': [
//       // 'ie-shim',
//       'core-js/es6/symbol',
//       'core-js/es6/object',
//       'core-js/es6/function',
//       'core-js/es6/parse-int',
//       'core-js/es6/parse-float',
//       'core-js/es6/number',
//       'core-js/es6/math',
//       'core-js/es6/string',
//       'core-js/es6/date',
//       'core-js/es6/array',
//       'core-js/es6/regexp',
//       'core-js/es6/map',
//       'core-js/es6/set',
//       'core-js/es6/weak-map',
//       'core-js/es6/weak-set',
//       'core-js/es6/typed',
//       'core-js/es6/reflect',
//       // 'core-js/es6/promise', // problem with firefox
//       'core-js/es7/reflect',
//       'zone.js/dist/zone',
//       'zone.js/dist/long-stack-trace-zone',
//     ],
//     'angular2vendor': [
//       '@angular/platform-browser',
//       '@angular/platform-browser-dynamic',
//       '@angular/core',
//       '@angular/common',
//       '@angular/forms',
//       '@angular/http',
//       '@angular/router',
//     ]
//   },

//   output: {
//     path: './dist',
//     filename: 'dll.[name].[hash].bundle.js',
//     sourceMapFilename: '[name].map',
//     chunkFilename: '[id].chunk.js',
//     library: '__DLL_[name]',
//   },


//   plugins: [
//     new webpack.DllPlugin({
//       name: '[vendor]',
//       path: 'dist/vendor-manifest.json',
//     }),
//     new webpack.DllPlugin({
//       name: 'polyfills',
//       path: 'dist/polyfills-manifest.json',
//     }),
//   ],

//   module: {
//       preLoaders: [
//       {
//         test: /\.js$/,
//         loader: 'source-map-loader',
//         exclude: [
//           // these packages have problems with their sourcemaps
//           path.resolve(__dirname, 'node_modules', 'rxjs'),
//           path.resolve(__dirname, 'node_modules', '@angular'),
//           path.resolve(__dirname, 'node_modules', '@ngrx'),
//           path.resolve(__dirname, 'node_modules', '@angular2-material'),
//         ]
//       }

//     ],
//     loaders: [
//     ]
//   },

//   node: {
//     global: 'window',
//     crypto: 'empty',
//     module: false,
//     clearImmediate: false,
//     setImmediate: false
//   }

// };










