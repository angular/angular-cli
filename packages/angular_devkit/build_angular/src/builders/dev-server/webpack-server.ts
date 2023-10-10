/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import {
  DevServerBuildOutput,
  WebpackLoggingCallback,
  runWebpackDevServer,
} from '@angular-devkit/build-webpack';
import { json, tags } from '@angular-devkit/core';
import * as path from 'path';
import { Observable, concatMap, from, switchMap } from 'rxjs';
import * as url from 'url';
import webpack from 'webpack';
import webpackDevServer from 'webpack-dev-server';
import { getCommonConfig, getDevServerConfig, getStylesConfig } from '../../tools/webpack/configs';
import { IndexHtmlWebpackPlugin } from '../../tools/webpack/plugins/index-html-webpack-plugin';
import { ServiceWorkerPlugin } from '../../tools/webpack/plugins/service-worker-plugin';
import {
  BuildEventStats,
  createWebpackLoggingCallback,
  generateBuildEventStats,
} from '../../tools/webpack/utils/stats';
import { ExecutionTransformer } from '../../transforms';
import { normalizeOptimization } from '../../utils';
import { colors } from '../../utils/color';
import { I18nOptions, loadTranslations } from '../../utils/i18n-options';
import { IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
import { createTranslationLoader } from '../../utils/load-translations';
import { NormalizedCachedOptions } from '../../utils/normalize-cache';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { assertCompatibleAngularVersion } from '../../utils/version';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../../utils/webpack-browser-config';
import { addError, addWarning } from '../../utils/webpack-diagnostics';
import { Schema as BrowserBuilderSchema, OutputHashing } from '../browser/schema';
import { NormalizedDevServerOptions } from './options';

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export type DevServerBuilderOutput = DevServerBuildOutput & {
  baseUrl: string;
  stats: BuildEventStats;
};

/**
 * Reusable implementation of the Angular Webpack development server builder.
 * @param options Dev Server options.
 * @param builderName The name of the builder used to build the application.
 * @param context The build context.
 * @param transforms A map of transforms that can be used to hook into some logic (such as
 *     transforming webpack configuration before passing it to webpack).
 */
// eslint-disable-next-line max-lines-per-function
export function serveWebpackBrowser(
  options: NormalizedDevServerOptions,
  builderName: string,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
    logging?: WebpackLoggingCallback;
    indexHtml?: IndexHtmlTransform;
  } = {},
): Observable<DevServerBuilderOutput> {
  // Check Angular version.
  const { logger, workspaceRoot } = context;
  assertCompatibleAngularVersion(workspaceRoot);

  async function setup(): Promise<{
    browserOptions: BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
  }> {
    if (options.hmr) {
      logger.warn(tags.stripIndents`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.
      See https://webpack.js.org/guides/hot-module-replacement for information on working with HMR for Webpack.`);
    }

    // Get the browser configuration from the target name.
    const rawBrowserOptions = (await context.getTargetOptions(
      options.buildTarget,
    )) as json.JsonObject & BrowserBuilderSchema;

    if (rawBrowserOptions.outputHashing && rawBrowserOptions.outputHashing !== OutputHashing.None) {
      // Disable output hashing for dev build as this can cause memory leaks
      // See: https://github.com/webpack/webpack-dev-server/issues/377#issuecomment-241258405
      rawBrowserOptions.outputHashing = OutputHashing.None;
      logger.warn(`Warning: 'outputHashing' option is disabled when using the dev-server.`);
    }

    const browserOptions = (await context.validateOptions(
      {
        ...rawBrowserOptions,
        watch: options.watch,
        verbose: options.verbose,
        // In dev server we should not have budgets because of extra libs such as socks-js
        budgets: undefined,
      } as json.JsonObject & BrowserBuilderSchema,
      builderName,
    )) as json.JsonObject & BrowserBuilderSchema;

    const { styles, scripts } = normalizeOptimization(browserOptions.optimization);
    if (scripts || styles.minify) {
      logger.error(tags.stripIndents`
        ****************************************************************************************
        This is a simple server for use in testing or debugging Angular applications locally.
        It hasn't been reviewed for security issues.

        DON'T USE IT FOR PRODUCTION!
        ****************************************************************************************
      `);
    }

    const { config, i18n } = await generateI18nBrowserWebpackConfigFromContext(
      browserOptions,
      context,
      (wco) => [getDevServerConfig(wco), getCommonConfig(wco), getStylesConfig(wco)],
      options,
    );

    if (!config.devServer) {
      throw new Error('Webpack Dev Server configuration was not set.');
    }

    let locale: string | undefined;
    if (i18n.shouldInline) {
      // Dev-server only supports one locale
      locale = [...i18n.inlineLocales][0];
    } else if (i18n.hasDefinedSourceLocale) {
      // use source locale if not localizing
      locale = i18n.sourceLocale;
    }

    let webpackConfig = config;

    // If a locale is defined, setup localization
    if (locale) {
      if (i18n.inlineLocales.size > 1) {
        throw new Error(
          'The development server only supports localizing a single locale per build.',
        );
      }

      await setupLocalize(
        locale,
        i18n,
        browserOptions,
        webpackConfig,
        options.cacheOptions,
        context,
      );
    }

    if (transforms.webpackConfiguration) {
      webpackConfig = await transforms.webpackConfiguration(webpackConfig);
    }

    webpackConfig.plugins ??= [];

    if (browserOptions.index) {
      const { scripts = [], styles = [], baseHref } = browserOptions;
      const entrypoints = generateEntryPoints({
        scripts,
        styles,
        // The below is needed as otherwise HMR for CSS will break.
        // styles.js and runtime.js needs to be loaded as a non-module scripts as otherwise `document.currentScript` will be null.
        // https://github.com/webpack-contrib/mini-css-extract-plugin/blob/90445dd1d81da0c10b9b0e8a17b417d0651816b8/src/hmr/hotModuleReplacement.js#L39
        isHMREnabled: !!webpackConfig.devServer?.hot,
      });

      webpackConfig.plugins.push(
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(workspaceRoot, getIndexInputFile(browserOptions.index)),
          outputPath: getIndexOutputFile(browserOptions.index),
          baseHref,
          entrypoints,
          deployUrl: browserOptions.deployUrl,
          sri: browserOptions.subresourceIntegrity,
          cache: options.cacheOptions,
          postTransform: transforms.indexHtml,
          optimization: normalizeOptimization(browserOptions.optimization),
          crossOrigin: browserOptions.crossOrigin,
          lang: locale,
        }),
      );
    }

    if (browserOptions.serviceWorker) {
      webpackConfig.plugins.push(
        new ServiceWorkerPlugin({
          baseHref: browserOptions.baseHref,
          root: context.workspaceRoot,
          projectRoot: options.projectRoot,
          ngswConfigPath: browserOptions.ngswConfigPath,
        }),
      );
    }

    return {
      browserOptions,
      webpackConfig,
    };
  }

  return from(setup()).pipe(
    switchMap(({ browserOptions, webpackConfig }) => {
      return runWebpackDevServer(webpackConfig, context, {
        logging: transforms.logging || createWebpackLoggingCallback(browserOptions, logger),
        webpackFactory: require('webpack') as typeof webpack,
        webpackDevServerFactory: require('webpack-dev-server') as typeof webpackDevServer,
      }).pipe(
        concatMap(async (buildEvent, index) => {
          const webpackRawStats = buildEvent.webpackStats;
          if (!webpackRawStats) {
            throw new Error('Webpack stats build result is required.');
          }

          // Resolve serve address.
          const publicPath = webpackConfig.devServer?.devMiddleware?.publicPath;

          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            port: buildEvent.port,
            pathname: typeof publicPath === 'string' ? publicPath : undefined,
          });

          if (index === 0) {
            logger.info(
              '\n' +
                tags.oneLine`
              **
              Angular Live Development Server is listening on ${options.host}:${buildEvent.port},
              open your browser on ${serverAddress}
              **
            ` +
                '\n',
            );

            if (options.open) {
              const open = (await import('open')).default;
              await open(serverAddress);
            }
          }

          if (buildEvent.success) {
            logger.info(`\n${colors.greenBright(colors.symbols.check)} Compiled successfully.`);
          } else {
            logger.info(`\n${colors.redBright(colors.symbols.cross)} Failed to compile.`);
          }

          return {
            ...buildEvent,
            baseUrl: serverAddress,
            stats: generateBuildEventStats(webpackRawStats, browserOptions),
          } as DevServerBuilderOutput;
        }),
      );
    }),
  );
}

async function setupLocalize(
  locale: string,
  i18n: I18nOptions,
  browserOptions: BrowserBuilderSchema,
  webpackConfig: webpack.Configuration,
  cacheOptions: NormalizedCachedOptions,
  context: BuilderContext,
) {
  const localeDescription = i18n.locales[locale];

  // Modify main entrypoint to include locale data
  if (
    localeDescription?.dataPath &&
    typeof webpackConfig.entry === 'object' &&
    !Array.isArray(webpackConfig.entry) &&
    webpackConfig.entry['main']
  ) {
    if (Array.isArray(webpackConfig.entry['main'])) {
      webpackConfig.entry['main'].unshift(localeDescription.dataPath);
    } else {
      webpackConfig.entry['main'] = [
        localeDescription.dataPath,
        webpackConfig.entry['main'] as string,
      ];
    }
  }

  let missingTranslationBehavior = browserOptions.i18nMissingTranslation || 'ignore';
  let translation = localeDescription?.translation || {};

  if (locale === i18n.sourceLocale) {
    missingTranslationBehavior = 'ignore';
    translation = {};
  }

  const i18nLoaderOptions = {
    locale,
    missingTranslationBehavior,
    translation: i18n.shouldInline ? translation : undefined,
    translationFiles: localeDescription?.files.map((file) =>
      path.resolve(context.workspaceRoot, file.path),
    ),
  };

  const i18nRule: webpack.RuleSetRule = {
    test: /\.[cm]?[tj]sx?$/,
    enforce: 'post',
    use: [
      {
        loader: require.resolve('../../tools/babel/webpack-loader'),
        options: {
          cacheDirectory:
            (cacheOptions.enabled && path.join(cacheOptions.path, 'babel-dev-server-i18n')) ||
            false,
          cacheIdentifier: JSON.stringify({
            locale,
            translationIntegrity: localeDescription?.files.map((file) => file.integrity),
          }),
          i18n: i18nLoaderOptions,
        },
      },
    ],
  };

  // Get the rules and ensure the Webpack configuration is setup properly
  const rules = webpackConfig.module?.rules || [];
  if (!webpackConfig.module) {
    webpackConfig.module = { rules };
  } else if (!webpackConfig.module.rules) {
    webpackConfig.module.rules = rules;
  }

  rules.push(i18nRule);

  // Add a plugin to reload translation files on rebuilds
  const loader = await createTranslationLoader();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  webpackConfig.plugins!.push({
    apply: (compiler: webpack.Compiler) => {
      compiler.hooks.thisCompilation.tap('build-angular', (compilation) => {
        if (i18n.shouldInline && i18nLoaderOptions.translation === undefined) {
          // Reload translations
          loadTranslations(
            locale,
            localeDescription,
            context.workspaceRoot,
            loader,
            {
              warn(message) {
                addWarning(compilation, message);
              },
              error(message) {
                addError(compilation, message);
              },
            },
            undefined,
            browserOptions.i18nDuplicateTranslation,
          );

          i18nLoaderOptions.translation = localeDescription.translation ?? {};
        }

        compilation.hooks.finishModules.tap('build-angular', () => {
          // After loaders are finished, clear out the now unneeded translations
          i18nLoaderOptions.translation = undefined;
        });
      });
    },
  });
}
