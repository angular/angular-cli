/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as path from 'path';
import type { FileImporter } from 'sass';
import { pathToFileURL } from 'url';
import type { Configuration, LoaderContext, RuleSetUseItem } from 'webpack';
import { StyleElement } from '../../builders/browser/schema';
import { SassWorkerImplementation } from '../../sass/sass-service';
import { SassLegacyWorkerImplementation } from '../../sass/sass-service-legacy';
import { WebpackConfigOptions } from '../../utils/build-options';
import { useLegacySass } from '../../utils/environment-options';
import {
  AnyComponentStyleBudgetChecker,
  PostcssCliResources,
  RemoveHashPlugin,
  SuppressExtractedTextChunksWebpackPlugin,
} from '../plugins';
import { CssOptimizerPlugin } from '../plugins/css-optimizer-plugin';
import {
  assetNameTemplateFactory,
  getOutputHashFormat,
  normalizeExtraEntryPoints,
} from '../utils/helpers';

export function resolveGlobalStyles(
  styleEntrypoints: StyleElement[],
  root: string,
  preserveSymlinks: boolean,
  skipResolution = false,
): { entryPoints: Record<string, string[]>; noInjectNames: string[]; paths: string[] } {
  const entryPoints: Record<string, string[]> = {};
  const noInjectNames: string[] = [];
  const paths: string[] = [];

  if (styleEntrypoints.length === 0) {
    return { entryPoints, noInjectNames, paths };
  }

  for (const style of normalizeExtraEntryPoints(styleEntrypoints, 'styles')) {
    let stylesheetPath = style.input;
    if (!skipResolution) {
      stylesheetPath = path.resolve(root, stylesheetPath);
      if (!fs.existsSync(stylesheetPath)) {
        try {
          stylesheetPath = require.resolve(style.input, { paths: [root] });
        } catch {}
      }
    }

    if (!preserveSymlinks) {
      stylesheetPath = fs.realpathSync(stylesheetPath);
    }

    // Add style entry points.
    if (entryPoints[style.bundleName]) {
      entryPoints[style.bundleName].push(stylesheetPath);
    } else {
      entryPoints[style.bundleName] = [stylesheetPath];
    }

    // Add non injected styles to the list.
    if (!style.inject) {
      noInjectNames.push(style.bundleName);
    }

    // Add global css paths.
    paths.push(stylesheetPath);
  }

  return { entryPoints, noInjectNames, paths };
}

// eslint-disable-next-line max-lines-per-function
export function getStylesConfig(wco: WebpackConfigOptions): Configuration {
  const { root, projectRoot, buildOptions } = wco;
  const extraPlugins: Configuration['plugins'] = [];

  extraPlugins.push(new AnyComponentStyleBudgetChecker(buildOptions.budgets));

  const cssSourceMap = buildOptions.sourceMap.styles;

  // Determine hashing format.
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // use includePaths from appConfig
  const includePaths =
    buildOptions.stylePreprocessorOptions?.includePaths?.map((p) => path.resolve(root, p)) ?? [];

  // Process global styles.
  const {
    entryPoints,
    noInjectNames,
    paths: globalStylePaths,
  } = resolveGlobalStyles(buildOptions.styles, root, !!buildOptions.preserveSymlinks);
  if (noInjectNames.length > 0) {
    // Add plugin to remove hashes from lazy styles.
    extraPlugins.push(new RemoveHashPlugin({ chunkNames: noInjectNames, hashFormat }));
  }

  const sassImplementation = useLegacySass
    ? new SassLegacyWorkerImplementation()
    : new SassWorkerImplementation();

  extraPlugins.push({
    apply(compiler) {
      compiler.hooks.shutdown.tap('sass-worker', () => {
        sassImplementation.close();
      });
    },
  });

  const assetNameTemplate = assetNameTemplateFactory(hashFormat);

  const extraPostcssPlugins: import('postcss').Plugin[] = [];

  // Attempt to setup Tailwind CSS
  // Only load Tailwind CSS plugin if configuration file was found.
  // This acts as a guard to ensure the project actually wants to use Tailwind CSS.
  // The package may be unknowningly present due to a third-party transitive package dependency.
  const tailwindConfigPath = getTailwindConfigPath(wco);
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
      extraPostcssPlugins.push(require(tailwindPackagePath)({ config: tailwindConfigPath }));
    }
  }

  const postcssImports = require('postcss-import');
  const autoprefixer: typeof import('autoprefixer') = require('autoprefixer');

  const postcssOptionsCreator = (inlineSourcemaps: boolean, extracted: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionGenerator = (loader: any) => ({
      map: inlineSourcemaps
        ? {
            inline: true,
            annotation: false,
          }
        : undefined,
      plugins: [
        postcssImports({
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

  // load component css as raw strings
  const componentsSourceMap = !!(
    cssSourceMap &&
    // Never use component css sourcemap when style optimizations are on.
    // It will just increase bundle size without offering good debug experience.
    !buildOptions.optimization.styles.minify &&
    // Inline all sourcemap types except hidden ones, which are the same as no sourcemaps
    // for component css.
    !buildOptions.sourceMap.hidden
  );

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
            !buildOptions.verbose,
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
            !buildOptions.verbose,
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
    entry: entryPoints,
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
                include: globalStylePaths,
                resourceQuery: { not: [/\?ngResource/] },
              },
              // Component styles are all styles except defined global styles
              {
                use: componentStyleLoaders,
                type: 'asset/source',
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

function getTailwindConfigPath({ projectRoot, root }: WebpackConfigOptions): string | undefined {
  // A configuration file can exist in the project or workspace root
  // The list of valid config files can be found:
  // https://github.com/tailwindlabs/tailwindcss/blob/8845d112fb62d79815b50b3bae80c317450b8b92/src/util/resolveConfigPath.js#L46-L52
  const tailwindConfigFiles = ['tailwind.config.js', 'tailwind.config.cjs'];
  for (const basePath of [projectRoot, root]) {
    for (const configFile of tailwindConfigFiles) {
      // Irrespective of the name project level configuration should always take precedence.
      const fullPath = path.join(basePath, configFile);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return undefined;
}

function getSassLoaderOptions(
  root: string,
  implementation: SassWorkerImplementation | SassLegacyWorkerImplementation,
  includePaths: string[],
  indentedSyntax: boolean,
  verbose: boolean,
  preserveSymlinks: boolean,
): Record<string, unknown> {
  return implementation instanceof SassWorkerImplementation
    ? {
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
        }),
      }
    : {
        sourceMap: true,
        api: 'legacy',
        implementation,
        sassOptions: {
          importer: (url: string, from: string) => {
            if (url.charAt(0) === '~') {
              throw new Error(
                `'${from}' imports '${url}' with a tilde. Usage of '~' in imports is no longer supported.`,
              );
            }

            return null;
          },
          // Prevent use of `fibers` package as it no longer works in newer Node.js versions
          fiber: false,
          indentedSyntax,
          // bootstrap-sass requires a minimum precision of 8
          precision: 8,
          includePaths,
          // Use expanded as otherwise sass will remove comments that are needed for autoprefixer
          // Ex: /* autoprefixer grid: autoplace */
          // See: https://github.com/webpack-contrib/sass-loader/blob/45ad0be17264ceada5f0b4fb87e9357abe85c4ff/src/getSassOptions.js#L68-L70
          outputStyle: 'expanded',
          // Silences compiler warnings from 3rd party stylesheets
          quietDeps: !verbose,
          verbose,
        },
      };
}

function getSassResolutionImporter(
  loaderContext: LoaderContext<{}>,
  root: string,
  preserveSymlinks: boolean,
): FileImporter<'async'> {
  const commonResolverOptions: Parameters<typeof loaderContext['getResolve']>[0] = {
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
    findFileUrl: (url, { fromImport }): Promise<URL | null> => {
      const resolve = fromImport ? resolveImport : resolveModule;

      return resolve(root, url)
        .then((file) => pathToFileURL(file))
        .catch(() => null);
    },
  };
}
