/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SassWorkerImplementation } from '@angular/build/private';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FileImporter } from 'sass';
import type { Configuration, LoaderContext, RuleSetUseItem } from 'webpack';
import { WebpackConfigOptions } from '../../../utils/build-options';
import { findTailwindConfigurationFile } from '../../../utils/tailwind';
import {
  AnyComponentStyleBudgetChecker,
  PostcssCliResources,
  RemoveHashPlugin,
  SuppressExtractedTextChunksWebpackPlugin,
} from '../plugins';
import { CssOptimizerPlugin } from '../plugins/css-optimizer-plugin';
import { StylesWebpackPlugin } from '../plugins/styles-webpack-plugin';
import {
  assetNameTemplateFactory,
  getOutputHashFormat,
  normalizeGlobalStyles,
} from '../utils/helpers';

// eslint-disable-next-line max-lines-per-function
export async function getStylesConfig(wco: WebpackConfigOptions): Promise<Configuration> {
  const { root, buildOptions, logger, projectRoot } = wco;
  const extraPlugins: Configuration['plugins'] = [];

  extraPlugins.push(new AnyComponentStyleBudgetChecker(buildOptions.budgets));

  const cssSourceMap = buildOptions.sourceMap.styles;

  // Determine hashing format.
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // use includePaths from appConfig
  const includePaths =
    buildOptions.stylePreprocessorOptions?.includePaths?.map((p) => path.resolve(root, p)) ?? [];

  // Process global styles.
  if (buildOptions.styles.length > 0) {
    const { entryPoints, noInjectNames } = normalizeGlobalStyles(buildOptions.styles);
    extraPlugins.push(
      new StylesWebpackPlugin({
        root,
        entryPoints,
        preserveSymlinks: buildOptions.preserveSymlinks,
      }),
    );

    if (noInjectNames.length > 0) {
      // Add plugin to remove hashes from lazy styles.
      extraPlugins.push(new RemoveHashPlugin({ chunkNames: noInjectNames, hashFormat }));
    }
  }

  const sassImplementation = new SassWorkerImplementation();

  extraPlugins.push({
    apply(compiler) {
      compiler.hooks.shutdown.tap('sass-worker', () => {
        void sassImplementation.close();
      });
    },
  });

  const assetNameTemplate = assetNameTemplateFactory(hashFormat);

  const extraPostcssPlugins: import('postcss').Plugin[] = [];

  // Attempt to setup Tailwind CSS
  // Only load Tailwind CSS plugin if configuration file was found.
  // This acts as a guard to ensure the project actually wants to use Tailwind CSS.
  // The package may be unknowningly present due to a third-party transitive package dependency.
  const tailwindConfigPath = await findTailwindConfigurationFile(root, projectRoot);
  if (tailwindConfigPath) {
    let tailwindPackagePath;
    try {
      tailwindPackagePath = require.resolve('tailwindcss', { paths: [root] });
    } catch {
      const relativeTailwindConfigPath = path.relative(root, tailwindConfigPath);
      logger.warn(
        `Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
          ` but the 'tailwindcss' package is not installed.` +
          ` To enable Tailwind CSS, please install the 'tailwindcss' package.`,
      );
    }
    if (tailwindPackagePath) {
      extraPostcssPlugins.push(require(tailwindPackagePath)({ config: tailwindConfigPath }));
    }
  }
  // Check for tailwind V4
  // Tailwind V4 uses the new `@tailwindcss/postcss` package
  try {
    const tailwindPostCSSPackagePath = require.resolve('@tailwindcss/postcss', { paths: [root] });
    try {
      require.resolve('tailwindcss', { paths: [root] });
      // Tailwind V4 is installed, add the plugin
      extraPostcssPlugins.push(require(tailwindPostCSSPackagePath)());
    } catch {
      logger.warn(
        `The '@tailwindcss/postcss' package is installed but the 'tailwindcss' package is not installed.` +
          ` To enable Tailwind CSS, please install the 'tailwindcss' package.`,
      );
    }
  } catch {
    // Tailwind V4 is not installed, no further action is needed
  }

  const autoprefixer: typeof import('autoprefixer') = require('autoprefixer');

  const postcssOptionsCreator = (inlineSourcemaps: boolean, extracted: boolean) => {
    const optionGenerator = (loader: LoaderContext<unknown>) => ({
      map: inlineSourcemaps
        ? {
            inline: true,
            annotation: false,
          }
        : undefined,
      plugins: [
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
        autoprefixer({
          ignoreUnknownVersions: true,
          overrideBrowserslist: buildOptions.supportedBrowsers,
        }),
      ],
    });
    // postcss-loader fails when trying to determine configuration files for data URIs
    optionGenerator.config = false;

    return optionGenerator;
  };

  let componentsSourceMap = !!cssSourceMap;
  if (cssSourceMap) {
    if (buildOptions.optimization.styles.minify) {
      // Never use component css sourcemap when style optimizations are on.
      // It will just increase bundle size without offering good debug experience.
      logger.warn(
        'Components styles sourcemaps are not generated when styles optimization is enabled.',
      );
      componentsSourceMap = false;
    } else if (buildOptions.sourceMap.hidden) {
      // Inline all sourcemap types except hidden ones, which are the same as no sourcemaps
      // for component css.
      logger.warn('Components styles sourcemaps are not generated when sourcemaps are hidden.');
      componentsSourceMap = false;
    }
  }

  // extract global css from js files into own css file.
  extraPlugins.push(new MiniCssExtractPlugin({ filename: `[name]${hashFormat.extract}.css` }));

  if (!buildOptions.hmr) {
    // don't remove `.js` files for `.css` when we are using HMR these contain HMR accept codes.
    // suppress empty .js files in css only entry points.
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  const postCss = require('postcss');
  const postCssLoaderPath = require.resolve('postcss-loader');

  const componentStyleLoaders: RuleSetUseItem[] = [
    {
      loader: require.resolve('css-loader'),
      options: {
        url: false,
        sourceMap: componentsSourceMap,
        importLoaders: 1,
        exportType: 'string',
        esModule: false,
      },
    },
    {
      loader: postCssLoaderPath,
      options: {
        implementation: postCss,
        postcssOptions: postcssOptionsCreator(componentsSourceMap, false),
      },
    },
  ];

  const globalStyleLoaders: RuleSetUseItem[] = [
    {
      loader: MiniCssExtractPlugin.loader,
    },
    {
      loader: require.resolve('css-loader'),
      options: {
        url: false,
        sourceMap: !!cssSourceMap,
        importLoaders: 1,
      },
    },
    {
      loader: postCssLoaderPath,
      options: {
        implementation: postCss,
        postcssOptions: postcssOptionsCreator(false, true),
        sourceMap: !!cssSourceMap,
      },
    },
  ];

  const styleLanguages: {
    extensions: string[];
    use: RuleSetUseItem[];
  }[] = [
    {
      extensions: ['css'],
      use: [],
    },
    {
      extensions: ['scss'],
      use: [
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: cssSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: getSassLoaderOptions(
            root,
            sassImplementation,
            includePaths,
            false,
            !!buildOptions.verbose,
            !!buildOptions.preserveSymlinks,
          ),
        },
      ],
    },
    {
      extensions: ['sass'],
      use: [
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: cssSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: getSassLoaderOptions(
            root,
            sassImplementation,
            includePaths,
            true,
            !!buildOptions.verbose,
            !!buildOptions.preserveSymlinks,
          ),
        },
      ],
    },
    {
      extensions: ['less'],
      use: [
        {
          loader: require.resolve('less-loader'),
          options: {
            implementation: require('less'),
            sourceMap: cssSourceMap,
            lessOptions: {
              javascriptEnabled: true,
              paths: includePaths,
            },
          },
        },
      ],
    },
  ];

  return {
    module: {
      rules: styleLanguages.map(({ extensions, use }) => ({
        test: new RegExp(`\\.(?:${extensions.join('|')})$`, 'i'),
        rules: [
          // Setup processing rules for global and component styles
          {
            oneOf: [
              // Global styles are only defined global styles
              {
                use: globalStyleLoaders,
                resourceQuery: /\?ngGlobalStyle/,
              },
              // Component styles are all styles except defined global styles
              {
                use: componentStyleLoaders,
                resourceQuery: /\?ngResource/,
              },
            ],
          },
          { use },
        ],
      })),
    },
    optimization: {
      minimizer: buildOptions.optimization.styles.minify
        ? [
            new CssOptimizerPlugin({
              supportedBrowsers: buildOptions.supportedBrowsers,
            }),
          ]
        : undefined,
    },
    plugins: extraPlugins,
  };
}

function getSassLoaderOptions(
  root: string,
  implementation: SassWorkerImplementation,
  includePaths: string[],
  indentedSyntax: boolean,
  verbose: boolean,
  preserveSymlinks: boolean,
): Record<string, unknown> {
  return {
    sourceMap: true,
    api: 'modern',
    implementation,
    // Webpack importer is only implemented in the legacy API and we have our own custom Webpack importer.
    // See: https://github.com/webpack-contrib/sass-loader/blob/997f3eb41d86dd00d5fa49c395a1aeb41573108c/src/utils.js#L642-L651
    webpackImporter: false,
    sassOptions: (loaderContext: LoaderContext<{}>) => ({
      importers: [getSassResolutionImporter(loaderContext, root, preserveSymlinks)],
      loadPaths: includePaths,
      // Use expanded as otherwise sass will remove comments that are needed for autoprefixer
      // Ex: /* autoprefixer grid: autoplace */
      // See: https://github.com/webpack-contrib/sass-loader/blob/45ad0be17264ceada5f0b4fb87e9357abe85c4ff/src/getSassOptions.js#L68-L70
      style: 'expanded',
      // Silences compiler warnings from 3rd party stylesheets
      quietDeps: !verbose,
      verbose,
      syntax: indentedSyntax ? 'indented' : 'scss',
      sourceMapIncludeSources: true,
    }),
  };
}

function getSassResolutionImporter(
  loaderContext: LoaderContext<{}>,
  root: string,
  preserveSymlinks: boolean,
): FileImporter<'async'> {
  const commonResolverOptions: Parameters<(typeof loaderContext)['getResolve']>[0] = {
    conditionNames: ['sass', 'style'],
    mainFields: ['sass', 'style', 'main', '...'],
    extensions: ['.scss', '.sass', '.css'],
    restrictions: [/\.((sa|sc|c)ss)$/i],
    preferRelative: true,
    symlinks: !preserveSymlinks,
  };

  // Sass also supports import-only files. If you name a file <name>.import.scss, it will only be loaded for imports, not for @uses.
  // See: https://sass-lang.com/documentation/at-rules/import#import-only-files
  const resolveImport = loaderContext.getResolve({
    ...commonResolverOptions,
    dependencyType: 'sass-import',
    mainFiles: ['_index.import', '_index', 'index.import', 'index', '...'],
  });

  const resolveModule = loaderContext.getResolve({
    ...commonResolverOptions,
    dependencyType: 'sass-module',
    mainFiles: ['_index', 'index', '...'],
  });

  return {
    findFileUrl: async (url, { fromImport, containingUrl }): Promise<URL | null> => {
      if (url.charAt(0) === '.') {
        // Let Sass handle relative imports.
        return null;
      }

      let resolveDir = root;
      if (containingUrl) {
        resolveDir = path.dirname(fileURLToPath(containingUrl));
      }

      const resolve = fromImport ? resolveImport : resolveModule;
      // Try to resolve from root of workspace
      const result = await tryResolve(resolve, resolveDir, url);

      return result ? pathToFileURL(result) : null;
    },
  };
}

async function tryResolve(
  resolve: ReturnType<LoaderContext<{}>['getResolve']>,
  root: string,
  url: string,
): Promise<string | undefined> {
  try {
    return await resolve(root, url);
  } catch {
    // Try to resolve a partial file
    // @use '@material/button/button' as mdc-button;
    // `@material/button/button` -> `@material/button/_button`
    const lastSlashIndex = url.lastIndexOf('/');
    const underscoreIndex = lastSlashIndex + 1;
    if (underscoreIndex > 0 && url.charAt(underscoreIndex) !== '_') {
      const partialFileUrl = `${url.slice(0, underscoreIndex)}_${url.slice(underscoreIndex)}`;

      return resolve(root, partialFileUrl).catch(() => undefined);
    }
  }

  return undefined;
}
