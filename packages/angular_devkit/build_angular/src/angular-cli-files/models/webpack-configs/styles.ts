// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { basename, normalize } from '@angular-devkit/core';
import * as webpack from 'webpack';
import * as path from 'path';
import { SuppressExtractedTextChunksWebpackPlugin } from '../../plugins/webpack';
import { getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../build-options';
import { findUp } from '../../utilities/find-up';
import { RawCssLoader } from '../../plugins/webpack';
import { ExtraEntryPoint } from '../../../browser';

const postcssUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssImports = require('postcss-import');
const PostcssCliResources = require('../../plugins/webpack').PostcssCliResources;

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
  const { root, projectRoot, buildOptions } = wco;

  // const appRoot = path.resolve(projectRoot, appConfig.root);
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: any[] = [];
  const cssSourceMap = buildOptions.sourceMap;

  // Maximum resource size to inline (KiB)
  const maximumInlineSize = 10;
  // Determine hashing format.
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing as string);
  // Convert absolute resource URLs to account for base-href and deploy-url.
  const baseHref = wco.buildOptions.baseHref || '';
  const deployUrl = wco.buildOptions.deployUrl || '';

  const postcssPluginCreator = function (loader: webpack.loader.LoaderContext) {
    return [
      postcssImports({
        resolve: (url: string, context: string) => {
          return new Promise<string>((resolve, reject) => {
            let hadTilde = false;
            if (url && url.startsWith('~')) {
              url = url.substr(1);
              hadTilde = true;
            }
            loader.resolve(context, (hadTilde ? '' : './') + url, (err: Error, result: string) => {
              if (err) {
                if (hadTilde) {
                  reject(err);
                  return;
                }
                loader.resolve(context, url, (err: Error, result: string) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(result);
                  }
                });
              } else {
                resolve(result);
              }
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
          // Note: This will only find the first node_modules folder.
          const nodeModules = findUp('node_modules', projectRoot);
          if (!nodeModules) {
            throw new Error('Cannot locate node_modules directory.')
          }
          const fullPath = path.join(nodeModules, url.substr(1));
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
          filter: (asset: PostcssUrlAsset) => {
            return maximumInlineSize > 0 && !asset.hash && !asset.absolutePath.endsWith('.cur');
          },
          url: 'inline',
          // NOTE: maxSize is in KB
          maxSize: maximumInlineSize,
          fallback: 'rebase',
        },
        { url: 'rebase' },
      ]),
      PostcssCliResources({
        deployUrl: loader.loaders[loader.loaderIndex].options.ident == 'extracted' ? '' : deployUrl,
        loader,
        filename: `[name]${hashFormat.file}.[ext]`,
      }),
      autoprefixer({ grid: true }),
    ];
  };

  // use includePaths from appConfig
  const includePaths: string[] = [];
  let lessPathOptions: { paths: string[] } = { paths: [] };

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
    (buildOptions.styles as ExtraEntryPoint[]).forEach(style => {
      let bundleName = style.bundleName;
      if (!bundleName) {
        if (style.lazy) {
          bundleName = basename(
            normalize(style.input.replace(/\.(js|css|scss|sass|less|styl)$/i, '')),
          );
        }
        else {
          bundleName = 'styles';
        }
      }

      const resolvedPath = path.resolve(root, style.input);

      // Add style entry points.
      if (entryPoints[bundleName]) {
        entryPoints[bundleName].push(resolvedPath)
      } else {
        entryPoints[bundleName] = [resolvedPath]
      }

      // Add global css paths.
      globalStylePaths.push(resolvedPath);
    });
  }

  // set base rules to derive final rules from
  const baseRules: webpack.NewUseRule[] = [
    { test: /\.css$/, use: [] },
    {
      test: /\.scss$|\.sass$/, use: [{
        loader: 'sass-loader',
        options: {
          sourceMap: cssSourceMap,
          // bootstrap-sass requires a minimum precision of 8
          precision: 8,
          includePaths
        }
      }]
    },
    {
      test: /\.less$/, use: [{
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

  // load component css as raw strings
  const rules: webpack.Rule[] = baseRules.map(({ test, use }) => ({
    exclude: globalStylePaths, test, use: [
      { loader: 'raw-loader' },
      {
        loader: 'postcss-loader',
        options: {
          ident: 'embedded',
          plugins: postcssPluginCreator,
          sourceMap: cssSourceMap
        }
      },
      ...(use as webpack.Loader[])
    ]
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    rules.push(...baseRules.map(({ test, use }) => {
      const extractTextPlugin = {
        use: [
          { loader: RawCssLoader },
          {
            loader: 'postcss-loader',
            options: {
              ident: buildOptions.extractCss ? 'extracted' : 'embedded',
              plugins: postcssPluginCreator,
              sourceMap: cssSourceMap
            }
          },
          ...(use as webpack.Loader[])
        ],
        // publicPath needed as a workaround https://github.com/angular/angular-cli/issues/4035
        publicPath: ''
      };
      const ret: any = {
        include: globalStylePaths,
        test,
        use: [
          buildOptions.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
          ...extractTextPlugin.use,
        ]
      };
      // Save the original options as arguments for eject.
      // if (buildOptions.extractCss) {
      //   ret[pluginArgs] = extractTextPlugin;
      // }
      return ret;
    }));
  }

  if (buildOptions.extractCss) {
    // extract global css from js files into own css file
    extraPlugins.push(
      new MiniCssExtractPlugin({ filename: `[name]${hashFormat.script}.css` }));
    // suppress empty .js files in css only entry points
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  return {
    // Workaround stylus-loader defect: https://github.com/shama/stylus-loader/issues/189
    loader: { stylus: {} },
    entry: entryPoints,
    module: { rules },
    plugins: [].concat(extraPlugins as any)
  };
}
