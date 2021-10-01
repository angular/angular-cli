/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import {
  DevServerBuildOutput,
  WebpackLoggingCallback,
  runWebpackDevServer,
} from '@angular-devkit/build-webpack';
import { json, tags } from '@angular-devkit/core';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { concatMap, switchMap } from 'rxjs/operators';
import * as url from 'url';
import webpack from 'webpack';
import webpackDevServer from 'webpack-dev-server';
import { ExecutionTransformer } from '../../transforms';
import { normalizeOptimization } from '../../utils';
import { checkPort } from '../../utils/check-port';
import { colors } from '../../utils/color';
import { I18nOptions } from '../../utils/i18n-options';
import { IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
import { NormalizedCachedOptions, normalizeCacheOptions } from '../../utils/normalize-cache';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { assertCompatibleAngularVersion } from '../../utils/version';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../../utils/webpack-browser-config';
import {
  getAnalyticsConfig,
  getBrowserConfig,
  getCommonConfig,
  getDevServerConfig,
  getStatsConfig,
  getStylesConfig,
  getTypeScriptConfig,
  getWorkerConfig,
} from '../../webpack/configs';
import { IndexHtmlWebpackPlugin } from '../../webpack/plugins/index-html-webpack-plugin';
import { createWebpackLoggingCallback } from '../../webpack/utils/stats';
import { Schema as BrowserBuilderSchema, OutputHashing } from '../browser/schema';
import { Schema } from './schema';

export type DevServerBuilderOptions = Schema & json.JsonObject;

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export type DevServerBuilderOutput = DevServerBuildOutput & {
  baseUrl: string;
};

/**
 * Reusable implementation of the Angular Webpack development server builder.
 * @param options Dev Server options.
 * @param context The build context.
 * @param transforms A map of transforms that can be used to hook into some logic (such as
 *     transforming webpack configuration before passing it to webpack).
 *
 * @experimental Direct usage of this function is considered experimental.
 */
// eslint-disable-next-line max-lines-per-function
export function serveWebpackBrowser(
  options: DevServerBuilderOptions,
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

  const browserTarget = targetFromTargetString(options.browserTarget);

  async function setup(): Promise<{
    browserOptions: json.JsonObject & BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
    projectRoot: string;
  }> {
    const projectName = context.target?.project;
    if (!projectName) {
      throw new Error('The builder requires a target.');
    }

    options.port = await checkPort(options.port ?? 4200, options.host || 'localhost');

    if (options.hmr) {
      logger.warn(tags.stripIndents`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.
      See https://webpack.js.org/guides/hot-module-replacement for information on working with HMR for Webpack.`);
    }

    if (
      !options.disableHostCheck &&
      options.host &&
      !/^127\.\d+\.\d+\.\d+/g.test(options.host) &&
      options.host !== 'localhost'
    ) {
      logger.warn(tags.stripIndent`
        Warning: This is a simple server for use in testing or debugging Angular applications
        locally. It hasn't been reviewed for security issues.

        Binding this server to an open connection can result in compromising your application or
        computer. Using a different host than the one passed to the "--host" flag might result in
        websocket connection issues. You might need to use "--disable-host-check" if that's the
        case.
      `);
    }

    if (options.disableHostCheck) {
      logger.warn(tags.oneLine`
        Warning: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
    }
    // Get the browser configuration from the target name.
    const rawBrowserOptions = (await context.getTargetOptions(browserTarget)) as json.JsonObject &
      BrowserBuilderSchema;

    if (rawBrowserOptions.outputHashing && rawBrowserOptions.outputHashing !== OutputHashing.None) {
      // Disable output hashing for dev build as this can cause memory leaks
      // See: https://github.com/webpack/webpack-dev-server/issues/377#issuecomment-241258405
      rawBrowserOptions.outputHashing = OutputHashing.None;
      logger.warn(`Warning: 'outputHashing' option is disabled when using the dev-server.`);
    }

    const metadata = await context.getProjectMetadata(projectName);
    const cacheOptions = normalizeCacheOptions(metadata, context.workspaceRoot);

    const browserName = await context.getBuilderNameForTarget(browserTarget);
    const browserOptions = (await context.validateOptions(
      {
        ...rawBrowserOptions,
        watch: options.watch,
        verbose: options.verbose,
        // In dev server we should not have budgets because of extra libs such as socks-js
        budgets: undefined,
      } as json.JsonObject & BrowserBuilderSchema,
      browserName,
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

    const { config, projectRoot, i18n } = await generateI18nBrowserWebpackConfigFromContext(
      browserOptions,
      context,
      (wco) => [
        getDevServerConfig(wco),
        getCommonConfig(wco),
        getBrowserConfig(wco),
        getStylesConfig(wco),
        getStatsConfig(wco),
        getAnalyticsConfig(wco, context),
        getTypeScriptConfig(wco),
        browserOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
      ],
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

      await setupLocalize(locale, i18n, browserOptions, webpackConfig, cacheOptions);
    }

    if (transforms.webpackConfiguration) {
      webpackConfig = await transforms.webpackConfiguration(webpackConfig);
    }

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

      webpackConfig.plugins ??= [];
      webpackConfig.plugins.push(
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(workspaceRoot, getIndexInputFile(browserOptions.index)),
          outputPath: getIndexOutputFile(browserOptions.index),
          baseHref,
          entrypoints,
          deployUrl: browserOptions.deployUrl,
          sri: browserOptions.subresourceIntegrity,
          cache: cacheOptions,
          postTransform: transforms.indexHtml,
          optimization: normalizeOptimization(browserOptions.optimization),
          crossOrigin: browserOptions.crossOrigin,
          lang: locale,
        }),
      );
    }

    return {
      browserOptions,
      webpackConfig,
      projectRoot,
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
          // Resolve serve address.
          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            port: buildEvent.port,
            pathname: webpackConfig.devServer?.devMiddleware?.publicPath,
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
          }

          return { ...buildEvent, baseUrl: serverAddress } as DevServerBuilderOutput;
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
  };

  const i18nRule: webpack.RuleSetRule = {
    test: /\.[cm]?[tj]sx?$/,
    enforce: 'post',
    use: [
      {
        loader: require.resolve('../../babel/webpack-loader'),
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
}

export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(serveWebpackBrowser);
