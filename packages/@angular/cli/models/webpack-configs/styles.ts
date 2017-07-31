import * as webpack from 'webpack';
import * as path from 'path';
import {
  SuppressExtractedTextChunksWebpackPlugin
} from '../../plugins/suppress-entry-chunks-webpack-plugin';
import { extraEntryParser, getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../webpack-config';
import { pluginArgs, postcssArgs } from '../../tasks/eject';

const cssnano = require('cssnano');
const postcssUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('exports-loader')
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
  const cssSourceMap = buildOptions.extractCss && buildOptions.sourcemaps;

  // Minify/optimize css in production.
  const minimizeCss = buildOptions.target === 'production';
  // Convert absolute resource URLs to account for base-href and deploy-url.
  const baseHref = wco.buildOptions.baseHref || '';
  const deployUrl = wco.buildOptions.deployUrl || '';

  const postcssPluginCreator = function() {
    // safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
    const importantCommentRe = /@preserve|@license|[@#]\s*source(?:Mapping)?URL|^!/i;
    const minimizeOptions = {
      autoprefixer: false, // full pass with autoprefixer is run separately
      safe: true,
      mergeLonghand: false, // version 3+ should be safe; cssnano currently uses 2.x
      discardComments : { remove: (comment: string) => !importantCommentRe.test(comment) }
    };

    return [
      postcssUrl({
        url: (URL: string) => {
          // Only convert root relative URLs, which CSS-Loader won't process into require().
          if (!URL.startsWith('/') || URL.startsWith('//')) {
            return URL;
          }

          if (deployUrl.match(/:\/\//)) {
            // If deployUrl contains a scheme, ignore baseHref use deployUrl as is.
            return `${deployUrl.replace(/\/$/, '')}${URL}`;
          } else if (baseHref.match(/:\/\//)) {
            // If baseHref contains a scheme, include it as is.
            return baseHref.replace(/\/$/, '') +
                `/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
          } else {
            // Join together base-href, deploy-url and the original URL.
            // Also dedupe multiple slashes into single ones.
            return `/${baseHref}/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
          }
        }
      }),
      autoprefixer(),
    ].concat(
        minimizeCss ? [cssnano(minimizeOptions)] : []
    );
  };
  (postcssPluginCreator as any)[postcssArgs] = {
    variableImports: {
      'autoprefixer': 'autoprefixer',
      'postcss-url': 'postcssUrl',
      'cssnano': 'cssnano'
    },
    variables: { minimizeCss, baseHref, deployUrl }
  };

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
  const baseRules: webpack.NewUseRule[] = [
    { test: /\.css$/, use: [] },
    { test: /\.scss$|\.sass$/, use: [{
        loader: 'sass-loader',
        options: {
          sourceMap: cssSourceMap,
          // bootstrap-sass requires a minimum precision of 8
          precision: 8,
          includePaths
        }
      }]
    },
    { test: /\.less$/, use: [{
        loader: 'less-loader',
        options: {
          sourceMap: cssSourceMap,
          paths: includePaths
        }
      }]
    },
    {
      test: /\.styl$/, use: [{
        loader: 'stylus-loader',
        options: {
          sourceMap: cssSourceMap,
          paths: includePaths
        }
      }]
    }
  ];

  const commonLoaders: webpack.Loader[] = [
    {
      loader: 'css-loader',
      options: {
        sourceMap: cssSourceMap,
        importLoaders: 1
      }
    },
    {
      loader: 'postcss-loader',
      options: {
        // A non-function property is required to workaround a webpack option handling bug
        ident: 'postcss',
        plugins: postcssPluginCreator
      }
    }
  ];

  // load component css as raw strings
  const rules: webpack.Rule[] = baseRules.map(({test, use}) => ({
    exclude: globalStylePaths, test, use: [
      'exports-loader?module.exports.toString()',
      ...commonLoaders,
      ...(use as webpack.Loader[])
    ]
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    rules.push(...baseRules.map(({test, use}) => {
      const extractTextPlugin = {
        use: [
          ...commonLoaders,
          ...(use as webpack.Loader[])
        ],
        // publicPath needed as a workaround https://github.com/angular/angular-cli/issues/4035
        publicPath: ''
      };
      const ret: any = {
        include: globalStylePaths,
        test,
        use: buildOptions.extractCss ? ExtractTextPlugin.extract(extractTextPlugin)
                                     : ['style-loader', ...extractTextPlugin.use]
      };
      // Save the original options as arguments for eject.
      if (buildOptions.extractCss) {
        ret[pluginArgs] = extractTextPlugin;
      }
      return ret;
    }));
  }

  if (buildOptions.extractCss) {
    // extract global css from js files into own css file
    extraPlugins.push(
      new ExtractTextPlugin({ filename: `[name]${hashFormat.extract}.bundle.css` }));
    // suppress empty .js files in css only entry points
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: [].concat(extraPlugins)
  };
}
