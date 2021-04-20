/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import {
  AnyComponentStyleBudgetChecker,
  PostcssCliResources,
  RemoveHashPlugin,
  SuppressExtractedTextChunksWebpackPlugin,
} from '../plugins';
import { assetNameTemplateFactory, getOutputHashFormat, normalizeExtraEntryPoints } from '../utils/helpers';

// tslint:disable-next-line:no-big-function
export function getStylesConfig(wco: WebpackConfigOptions) {
  const autoprefixer = require('autoprefixer');
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  const postcssImports = require('postcss-import');

  const { root, buildOptions } = wco;
  const entryPoints: { [key: string]: [string, ...string[]] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: { apply(compiler: webpack.Compiler): void }[] = [];

  extraPlugins.push(new AnyComponentStyleBudgetChecker(buildOptions.budgets));

  const cssSourceMap = buildOptions.sourceMap.styles;

  // Determine hashing format.
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing as string);

  // use includePaths from appConfig
  const includePaths = buildOptions.stylePreprocessorOptions?.includePaths?.map(p => path.resolve(root, p)) ?? [];

  // Process global styles.
  if (buildOptions.styles.length > 0) {
    const chunkNames: string[] = [];

    normalizeExtraEntryPoints(buildOptions.styles, 'styles').forEach(style => {
      let resolvedPath = path.resolve(root, style.input);
      if (!fs.existsSync(resolvedPath)) {
        try {
          resolvedPath = require.resolve(style.input, { paths: [root] });
        } catch {}
      }

      if (!buildOptions.preserveSymlinks) {
        resolvedPath = fs.realpathSync(resolvedPath);
      }

      // Add style entry points.
      if (entryPoints[style.bundleName]) {
        entryPoints[style.bundleName].push(resolvedPath);
      } else {
        entryPoints[style.bundleName] = [resolvedPath];
      }

      // Add non injected styles to the list.
      if (!style.inject) {
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

  let sassImplementation: {} | undefined;
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    sassImplementation = require('node-sass');
    wco.logger.warn(tags.oneLine`'node-sass' usage is deprecated and will be removed in a future major version.
      To opt-out of the deprecated behaviour and start using 'sass' uninstall 'node-sass'.`,
    );
  } catch {
    sassImplementation = require('sass');
  }

  // set base rules to derive final rules from
  const baseRules: { test: RegExp, use: webpack.RuleSetLoader[] }[] = [
    { test: /\.css$/, use: [] },
    {
      test: /\.scss$|\.sass$/,
      use: [
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: cssSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: {
            implementation: sassImplementation,
            sourceMap: true,
            sassOptions: {
              // bootstrap-sass requires a minimum precision of 8
              precision: 8,
              includePaths,
              // Use expanded as otherwise sass will remove comments that are needed for autoprefixer
              // Ex: /* autoprefixer grid: autoplace */
              // tslint:disable-next-line: max-line-length
              // See: https://github.com/webpack-contrib/sass-loader/blob/45ad0be17264ceada5f0b4fb87e9357abe85c4ff/src/getSassOptions.js#L68-L70
              outputStyle: 'expanded',
            },
          },
        },
      ],
    },
    {
      test: /\.less$/,
      use: [
        {
          loader: require.resolve('less-loader'),
          options: {
            implementation: require('less'),
            sourceMap: cssSourceMap,
            lessOptions: {
              math: 'always',
              javascriptEnabled: true,
              paths: includePaths,
            },
          },
        },
      ],
    },
    {
      test: /\.styl$/,
      use: [
        {
          loader: require.resolve('stylus-loader'),
          options: {
            sourceMap: cssSourceMap,
            stylusOptions: {
              compress: false,
              sourceMap: { comment: false },
              paths: includePaths,
            },
          },
        },
      ],
    },
  ];

  const assetNameTemplate = assetNameTemplateFactory(hashFormat);

  const extraPostcssPlugins: import('postcss').Plugin[] = [];

  // Attempt to setup Tailwind CSS
  // A configuration file can exist in the project or workspace root
  const tailwindConfigFile = 'tailwind.config.js';
  let tailwindConfigPath;
  for (const basePath of [wco.projectRoot, wco.root]) {
    const fullPath = path.join(basePath, tailwindConfigFile);
    if (fs.existsSync(fullPath)) {
      tailwindConfigPath = fullPath;
      break;
    }
  }
  // Only load Tailwind CSS plugin if configuration file was found.
  // This acts as a guard to ensure the project actually wants to use Tailwind CSS.
  // The package may be unknowningly present due to a third-party transitive package dependency.
  if (tailwindConfigPath) {
    let tailwindPackagePath;
    try {
      tailwindPackagePath = require.resolve('tailwindcss', { paths: [wco.root] });
    } catch {
      const relativeTailwindConfigPath = path.relative(wco.root, tailwindConfigPath);
      wco.logger.warn(
        `Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
          ` but the 'tailwindcss' package is not installed.` +
          ` To enable Tailwind CSS, please install the 'tailwindcss' package.`,
      );
    }
    if (tailwindPackagePath) {
      if (process.env['TAILWIND_MODE'] === undefined) {
        process.env['TAILWIND_MODE'] = buildOptions.watch ? 'watch' : 'build';
      }
      extraPostcssPlugins.push(require(tailwindPackagePath)({ config: tailwindConfigPath }));
    }
  }

  const postcssOptionsCreator = (sourceMap: boolean, extracted: boolean | undefined) => {
    return (loader: webpack.loader.LoaderContext) => ({
      map: sourceMap && {
        inline: true,
        annotation: false,
      },
      plugins: [
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
          baseHref: buildOptions.baseHref,
          deployUrl: buildOptions.deployUrl,
          resourcesOutputPath: buildOptions.resourcesOutputPath,
          loader,
          filename: assetNameTemplate,
          emitFile: buildOptions.platform !== 'server',
          extracted,
        }),
        ...extraPostcssPlugins,
        autoprefixer(),
      ],
    });
  };

  // load component css as raw strings
  const componentsSourceMap = !!(
    cssSourceMap
    // Never use component css sourcemap when style optimizations are on.
    // It will just increase bundle size without offering good debug experience.
    && !buildOptions.optimization.styles.minify
    // Inline all sourcemap types except hidden ones, which are the same as no sourcemaps
    // for component css.
    && !buildOptions.sourceMap.hidden
  );

  const rules: webpack.RuleSetRule[] = baseRules.map(({ test, use }) => ({
    exclude: globalStylePaths,
    test,
    use: [
      { loader: require.resolve('raw-loader') },
      {
        loader: require.resolve('postcss-loader'),
        options: {
          implementation: require('postcss'),
          postcssOptions: postcssOptionsCreator(componentsSourceMap, false),
        },
      },
      ...use,
    ],
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    const globalSourceMap = !!cssSourceMap && !buildOptions.sourceMap.hidden;

    rules.push(
      ...baseRules.map(({ test, use }) => {
        return {
          include: globalStylePaths,
          test,
          use: [
            buildOptions.extractCss
              ? {
                loader: MiniCssExtractPlugin.loader,
              }
              : require.resolve('style-loader'),
            {
              loader: require.resolve('css-loader'),
              options: {
                url: false,
                sourceMap: globalSourceMap,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                implementation: require('postcss'),
                postcssOptions: postcssOptionsCreator(globalSourceMap, buildOptions.extractCss),
              },
            },
            ...use,
          ],
        };
      }),
    );
  }

  if (buildOptions.extractCss) {
    // extract global css from js files into own css file.
    extraPlugins.push(
      new MiniCssExtractPlugin({ filename: `[name]${hashFormat.extract}.css` }),
    );

    if (!buildOptions.hmr) {
      // don't remove `.js` files for `.css` when we are using HMR these contain HMR accept codes.
      // suppress empty .js files in css only entry points.
      extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
    }
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: extraPlugins,
  };
}
