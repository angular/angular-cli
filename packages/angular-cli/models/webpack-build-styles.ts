import * as webpack from 'webpack';
import * as path from 'path';
import {
  SuppressExtractedTextChunksWebpackPlugin
} from '../plugins/suppress-entry-chunks-webpack-plugin';
import { extraEntryParser, getOutputHashFormat } from './webpack-build-utils';

const postcssDiscardComments = require('postcss-discard-comments');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('raw-loader')
 * require('style-loader')
 * require('postcss-loader')
 * require('css-loader')
 * require('stylus')
 * require('stylus-loader')
 * require('less')
 * require('less-loader')
 * require('node-sass')
 * require('sass-loader')
 */

export function getWebpackStylesConfig(
  projectRoot: string,
  appConfig: any,
  target: string,
  sourcemap: boolean,
  outputHashing: string,
  extractCss: boolean,
) {

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: any[] = [];

  // discard comments in production
  const extraPostCssPlugins = target === 'production' ? [postcssDiscardComments] : [];

  // determine hashing format
  const hashFormat = getOutputHashFormat(outputHashing);

  // use includePaths from appConfig
  const includePaths: string [] = [];

  if (appConfig.stylePreprocessorOptions
    && appConfig.stylePreprocessorOptions.includePaths
    && appConfig.stylePreprocessorOptions.includePaths.length > 0
  ) {
    appConfig.stylePreprocessorOptions.includePaths.forEach((includePath: string) =>
      includePaths.push(path.resolve(appRoot, includePath)));
  }

  // process global styles
  if (appConfig.styles.length > 0) {
    const globalStyles = extraEntryParser(appConfig.styles, appRoot, 'styles');
    // add style entry points
    globalStyles.forEach(style =>
      entryPoints[style.entry]
        ? entryPoints[style.entry].push(style.path)
        : entryPoints[style.entry] = [style.path]
    );
    // add global css paths
    globalStylePaths.push(...globalStyles.map((style) => style.path));
  }

  // set base rules to derive final rules from
  const baseRules = [
    { test: /\.css$/, loaders: [] },
    { test: /\.scss$|\.sass$/, loaders: ['sass-loader'] },
    { test: /\.less$/, loaders: ['less-loader'] },
    // stylus-loader doesn't support webpack.LoaderOptionsPlugin properly,
    // so we need to add options in it's query
    { test: /\.styl$/, loaders: [`stylus-loader?${JSON.stringify({
      sourceMap: sourcemap,
      paths: includePaths
    })}`] }
  ];

  const commonLoaders = ['postcss-loader'];

  // load component css as raw strings
  let rules: any = baseRules.map(({test, loaders}) => ({
    exclude: globalStylePaths, test, loaders: ['raw-loader', ...commonLoaders, ...loaders]
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    rules.push(...baseRules.map(({test, loaders}) => ({
      include: globalStylePaths, test, loaders: ExtractTextPlugin.extract({
        remove: false,
        loader: ['css-loader', ...commonLoaders, ...loaders],
        fallbackLoader: 'style-loader',
        // publicPath needed as a workaround https://github.com/angular/angular-cli/issues/4035
        publicPath: ''
      })
    })));
  }

  // supress empty .js files in css only entry points
  if (extractCss) {
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: [
      // extract global css from js files into own css file
      new ExtractTextPlugin({
        filename: `[name]${hashFormat.extract}.bundle.css`,
        disable: !extractCss
      }),
      new webpack.LoaderOptionsPlugin({
        options: {
          postcss: [autoprefixer()].concat(extraPostCssPlugins),
          cssLoader: { sourceMap: sourcemap },
          sassLoader: { sourceMap: sourcemap, includePaths },
          // less-loader doesn't support paths
          lessLoader: { sourceMap: sourcemap },
          // stylus-loader doesn't support LoaderOptionsPlugin properly, options in query instead
          // context needed as a workaround https://github.com/jtangelder/sass-loader/issues/285
          context: projectRoot,
        },
      })
    ].concat(extraPlugins)
  };
}
