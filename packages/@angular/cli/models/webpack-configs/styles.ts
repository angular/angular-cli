import * as webpack from 'webpack';
import * as path from 'path';
import {
  SuppressExtractedTextChunksWebpackPlugin
} from '../../plugins/suppress-entry-chunks-webpack-plugin';
import { extraEntryParser, getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../webpack-config';

const cssnano = require('cssnano');
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

export function getStylesConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: any[] = [];
  // style-loader does not support sourcemaps without absolute publicPath, so it's
  // better to disable them when not extracting css
  // https://github.com/webpack-contrib/style-loader#recommended-configuration
  const cssSourceMap = buildOptions.extractCss && buildOptions.sourcemap;

  // minify/optimize css in production
  // autoprefixer is always run separately so disable here
  const extraPostCssPlugins = buildOptions.target === 'production'
    ? [cssnano({ safe: true, autoprefixer: false })]
    : [];

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // use includePaths from appConfig
  const includePaths: string[] = [];

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
    // so we need to add options in its query
    {
      test: /\.styl$/, loaders: [`stylus-loader?${JSON.stringify({
        sourceMap: cssSourceMap,
        paths: includePaths
      })}`]
    }
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
        use: [
          // css-loader doesn't support webpack.LoaderOptionsPlugin properly,
          // so we need to add options in its query
          `css-loader?${JSON.stringify({ sourceMap: cssSourceMap })}`,
          ...commonLoaders,
          ...loaders
        ],
        fallback: 'style-loader',
        // publicPath needed as a workaround https://github.com/angular/angular-cli/issues/4035
        publicPath: ''
      })
    })));
  }

  // supress empty .js files in css only entry points
  if (buildOptions.extractCss) {
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: [
      // extract global css from js files into own css file
      new ExtractTextPlugin({
        filename: `[name]${hashFormat.extract}.bundle.css`,
        disable: !buildOptions.extractCss
      }),
      new webpack.LoaderOptionsPlugin({
        sourceMap: cssSourceMap,
        options: {
          postcss: [autoprefixer()].concat(extraPostCssPlugins),
          // css-loader, stylus-loader don't support LoaderOptionsPlugin properly
          // options are in query instead
          sassLoader: { sourceMap: cssSourceMap, includePaths },
          // less-loader doesn't support paths
          lessLoader: { sourceMap: cssSourceMap },
          // context needed as a workaround https://github.com/jtangelder/sass-loader/issues/285
          context: projectRoot,
        },
      })
    ].concat(extraPlugins)
  };
}
