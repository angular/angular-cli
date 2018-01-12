import * as webpack from 'webpack';
import * as path from 'path';
import {
  SuppressExtractedTextChunksWebpackPlugin
} from '../../plugins/suppress-entry-chunks-webpack-plugin';
import { extraEntryParser, getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../webpack-config';
import { pluginArgs, postcssArgs } from '../../tasks/eject';
import { CleanCssWebpackPlugin } from '../../plugins/cleancss-webpack-plugin';

const postcssUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const postcssImports = require('postcss-import');

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

interface PostcssUrlAsset {
  url: string;
  hash: string;
  absolutePath: string;
}

export function getStylesConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: any[] = [];
  const cssSourceMap = buildOptions.sourcemaps;

  // Minify/optimize css in production.
  const minimizeCss = buildOptions.target === 'production';
  // Convert absolute resource URLs to account for base-href and deploy-url.
  const baseHref = wco.buildOptions.baseHref || '';
  const deployUrl = wco.buildOptions.deployUrl || '';

  const postcssPluginCreator = function(loader: webpack.loader.LoaderContext) {
    return [
      postcssImports({
        resolve: (url: string, context: string) => {
          return new Promise<string>((resolve, reject) => {
            if (url && url.startsWith('~')) {
              url = url.substr(1);
            }
            loader.resolve(context, url, (err: Error, result: string) => {
              if (err) {
                reject(err);
                return;
              }

              resolve(result);
            });
          });
        },
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
        }
      }),
      postcssUrl({
        filter: ({ url }: PostcssUrlAsset) => url.startsWith('~'),
        url: ({ url }: PostcssUrlAsset) => {
          const fullPath = path.join(projectRoot, 'node_modules', url.substr(1));
          return path.relative(loader.context, fullPath).replace(/\\/g, '/');
        }
      }),
      postcssUrl([
        {
          // Only convert root relative URLs, which CSS-Loader won't process into require().
          filter: ({ url }: PostcssUrlAsset) => url.startsWith('/') && !url.startsWith('//'),
          url: ({ url }: PostcssUrlAsset) => {
            if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
              // If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
              return `${deployUrl.replace(/\/$/, '')}${url}`;
            } else if (baseHref.match(/:\/\//)) {
              // If baseHref contains a scheme, include it as is.
              return baseHref.replace(/\/$/, '') +
                  `/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
            } else {
              // Join together base-href, deploy-url and the original URL.
              // Also dedupe multiple slashes into single ones.
              return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
            }
          }
        },
        {
          // TODO: inline .cur if not supporting IE (use browserslist to check)
          filter: (asset: PostcssUrlAsset) => !asset.hash && !asset.absolutePath.endsWith('.cur'),
          url: 'inline',
          // NOTE: maxSize is in KB
          maxSize: 10,
          fallback: 'rebase',
        }
      ]),
      autoprefixer(),
    ];
  };
  (postcssPluginCreator as any)[postcssArgs] = {
    variableImports: {
      'autoprefixer': 'autoprefixer',
      'postcss-url': 'postcssUrl',
      'postcss-import': 'postcssImports',
    },
    variables: { minimizeCss, baseHref, deployUrl, projectRoot }
  };

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // use includePaths from appConfig
  const includePaths: string[] = [];
  let lessPathOptions: { paths: string[] };

  if (appConfig.stylePreprocessorOptions
    && appConfig.stylePreprocessorOptions.includePaths
    && appConfig.stylePreprocessorOptions.includePaths.length > 0
  ) {
    appConfig.stylePreprocessorOptions.includePaths.forEach((includePath: string) =>
      includePaths.push(path.resolve(appRoot, includePath)));
    lessPathOptions = {
      paths: includePaths,
    };
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
          ...lessPathOptions,
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
        import: false,
      }
    },
    {
      loader: 'postcss-loader',
      options: {
        // A non-function property is required to workaround a webpack option handling bug
        ident: 'postcss',
        plugins: postcssPluginCreator,
        sourceMap: cssSourceMap
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

  if (minimizeCss) {
    extraPlugins.push(new CleanCssWebpackPlugin({ sourceMap: cssSourceMap }));
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: [].concat(extraPlugins)
  };
}
