/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import * as webpack from 'webpack';
import {
  PostcssCliResources,
  RawCssLoader,
  RemoveHashPlugin,
  SuppressExtractedTextChunksWebpackPlugin,
} from '../../plugins/webpack';
import { WebpackConfigOptions } from '../build-options';
import { getOutputHashFormat, normalizeExtraEntryPoints } from './utils';

const autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssImports = require('postcss-import');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('style-loader')
 * require('postcss-loader')
 * require('stylus')
 * require('stylus-loader')
 * require('less')
 * require('less-loader')
 * require('node-sass')
 * require('sass-loader')
 */

export function getStylesConfig(wco: WebpackConfigOptions) {
  const { root, buildOptions } = wco;
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins = [];
  const cssSourceMap = buildOptions.sourceMap;

  // Determine hashing format.
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing as string);
  // Convert absolute resource URLs to account for base-href and deploy-url.
  const baseHref = wco.buildOptions.baseHref || '';
  const deployUrl = wco.buildOptions.deployUrl || '';

  const postcssPluginCreator = function (loader: webpack.loader.LoaderContext) {
    return [
      postcssImports({
        resolve: (url: string) => url.startsWith('~') ? url.substr(1) : url,
        load: (filename: string) => {
          return new Promise<string>((resolve, reject) => {
            loader.fs.readFile(filename, (err: Error, data: Buffer) => {
              if (err) {
                reject(err);

                return;
              }

              const content = data.toString();
              resolve(content);
            });
          });
        },
      }),
      PostcssCliResources({
        baseHref,
        deployUrl,
        loader,
        filename: `[name]${hashFormat.file}.[ext]`,
      }),
      autoprefixer(),
    ];
  };

  // use includePaths from appConfig
  const includePaths: string[] = [];
  let lessPathOptions: { paths?: string[] } = {};

  if (buildOptions.stylePreprocessorOptions
    && buildOptions.stylePreprocessorOptions.includePaths
    && buildOptions.stylePreprocessorOptions.includePaths.length > 0
  ) {
    buildOptions.stylePreprocessorOptions.includePaths.forEach((includePath: string) =>
      includePaths.push(path.resolve(root, includePath)));
    lessPathOptions = {
      paths: includePaths,
    };
  }

  // Process global styles.
  if (buildOptions.styles.length > 0) {
    const chunkNames: string[] = [];

    normalizeExtraEntryPoints(buildOptions.styles, 'styles').forEach(style => {
      const resolvedPath = path.resolve(root, style.input);
      // Add style entry points.
      if (entryPoints[style.bundleName]) {
        entryPoints[style.bundleName].push(resolvedPath);
      } else {
        entryPoints[style.bundleName] = [resolvedPath];
      }

      // Add lazy styles to the list.
      if (style.lazy) {
        chunkNames.push(style.bundleName);
      }

      // Add global css paths.
      globalStylePaths.push(resolvedPath);
    });

    if (chunkNames.length > 0) {
      // Add plugin to remove hashes from lazy styles.
      extraPlugins.push(new RemoveHashPlugin({ chunkNames, hashFormat }));
    }
  }

  let dartSass: {} | undefined;
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    dartSass = require('sass');
  } catch { }

  let fiber: {} | undefined;
  if (dartSass) {
    try {
      // tslint:disable-next-line:no-implicit-dependencies
      fiber = require('fibers');
    } catch { }
  }

  // set base rules to derive final rules from
  const baseRules: webpack.RuleSetRule[] = [
    { test: /\.css$/, use: [] },
    {
      test: /\.scss$|\.sass$/,
      use: [{
        loader: 'sass-loader',
        options: {
          implementation: dartSass,
          fiber,
          sourceMap: cssSourceMap,
          // bootstrap-sass requires a minimum precision of 8
          precision: 8,
          includePaths,
        },
      }],
    },
    {
      test: /\.less$/,
      use: [{
        loader: 'less-loader',
        options: {
          sourceMap: cssSourceMap,
          javascriptEnabled: true,
          ...lessPathOptions,
        },
      }],
    },
    {
      test: /\.styl$/,
      use: [{
        loader: 'stylus-loader',
        options: {
          sourceMap: cssSourceMap,
          paths: includePaths,
        },
      }],
    },
  ];

  // load component css as raw strings
  const rules: webpack.RuleSetRule[] = baseRules.map(({ test, use }) => ({
    exclude: globalStylePaths,
    test,
    use: [
      { loader: 'raw-loader' },
      {
        loader: 'postcss-loader',
        options: {
          ident: 'embedded',
          plugins: postcssPluginCreator,
          sourceMap: cssSourceMap ? 'inline' : false,
        },
      },
      ...(use as webpack.Loader[]),
    ],
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    rules.push(...baseRules.map(({ test, use }) => {
      return {
        include: globalStylePaths,
        test,
        use: [
          buildOptions.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
          RawCssLoader,
          {
            loader: 'postcss-loader',
            options: {
              ident: buildOptions.extractCss ? 'extracted' : 'embedded',
              plugins: postcssPluginCreator,
              sourceMap: cssSourceMap && !buildOptions.extractCss ? 'inline' : cssSourceMap,
            },
          },
          ...(use as webpack.Loader[]),
        ],
      };
    }));
  }

  if (buildOptions.extractCss) {
    extraPlugins.push(
      // extract global css from js files into own css file
      new MiniCssExtractPlugin({ filename: `[name]${hashFormat.extract}.css` }),
      // suppress empty .js files in css only entry points
      new SuppressExtractedTextChunksWebpackPlugin(),
    );
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: extraPlugins,
  };
}
