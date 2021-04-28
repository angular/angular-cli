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
import * as ts from 'typescript';
import * as url from 'url';
import * as webpack from 'webpack';
import * as webpackDevServer from 'webpack-dev-server';
import { getAnalyticsConfig, getCompilerConfig } from '../browser';
import { OutputHashing, Schema as BrowserBuilderSchema } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { BuildBrowserFeatures, normalizeOptimization } from '../utils';
import { findCachePath } from '../utils/cache-path';
import { checkPort } from '../utils/check-port';
import { colors } from '../utils/color';
import { I18nOptions } from '../utils/i18n-options';
import { IndexHtmlTransform } from '../utils/index-file/index-html-generator';
import { generateEntryPoints } from '../utils/package-chunk-sort';
import { readTsconfig } from '../utils/read-tsconfig';
import { assertCompatibleAngularVersion } from '../utils/version';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../utils/webpack-browser-config';
import { addError, addWarning } from '../utils/webpack-diagnostics';
import {
  getBrowserConfig,
  getCommonConfig,
  getDevServerConfig,
  getStatsConfig,
  getStylesConfig,
  getWorkerConfig,
} from '../webpack/configs';
import { IndexHtmlWebpackPlugin } from '../webpack/plugins/index-html-webpack-plugin';
import { createWebpackLoggingCallback } from '../webpack/utils/stats';
import { Schema } from './schema';

export type DevServerBuilderOptions = Schema & json.JsonObject;

const devServerBuildOverriddenKeys: (keyof DevServerBuilderOptions)[] = [
  'watch',
  'optimization',
  'aot',
  'sourceMap',
  'vendorChunk',
  'commonChunk',
  'baseHref',
  'progress',
  'poll',
  'verbose',
  'deployUrl',
];

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
// tslint:disable-next-line: no-big-function
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
  assertCompatibleAngularVersion(workspaceRoot, logger);

  const browserTarget = targetFromTargetString(options.browserTarget);

  async function setup(): Promise<{
    browserOptions: json.JsonObject & BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
    projectRoot: string;
    locale: string | undefined;
  }> {
    // Get the browser configuration from the target name.
    const rawBrowserOptions = (await context.getTargetOptions(browserTarget)) as json.JsonObject &
      BrowserBuilderSchema;
    options.port = await checkPort(options.port ?? 4200, options.host || 'localhost');

    // Override options we need to override, if defined.
    const overrides = (Object.keys(options) as (keyof DevServerBuilderOptions)[])
      .filter((key) => options[key] !== undefined && devServerBuildOverriddenKeys.includes(key))
      .reduce<json.JsonObject & Partial<BrowserBuilderSchema>>(
        (previous, key) => ({
          ...previous,
          [key]: options[key],
        }),
        {},
      );

    // Get dev-server only options.
    type DevServerOptions = Partial<
      Omit<
        Schema,
        | 'watch'
        | 'optimization'
        | 'aot'
        | 'sourceMap'
        | 'vendorChunk'
        | 'commonChunk'
        | 'baseHref'
        | 'progress'
        | 'poll'
        | 'verbose'
        | 'deployUrl'
      >
    >;
    const devServerOptions: DevServerOptions = (Object.keys(options) as (keyof Schema)[])
      .filter((key) => !devServerBuildOverriddenKeys.includes(key) && key !== 'browserTarget')
      .reduce<DevServerOptions>(
        (previous, key) => ({
          ...previous,
          [key]: options[key],
        }),
        {},
      );

    // In dev server we should not have budgets because of extra libs such as socks-js
    overrides.budgets = undefined;

    if (rawBrowserOptions.outputHashing && rawBrowserOptions.outputHashing !== OutputHashing.None) {
      // Disable output hashing for dev build as this can cause memory leaks
      // See: https://github.com/webpack/webpack-dev-server/issues/377#issuecomment-241258405
      overrides.outputHashing = OutputHashing.None;
      logger.warn(`Warning: 'outputHashing' option is disabled when using the dev-server.`);
    }

    // Webpack's live reload functionality adds the `strip-ansi` package which is commonJS
    rawBrowserOptions.allowedCommonJsDependencies ??= [];
    rawBrowserOptions.allowedCommonJsDependencies.push('strip-ansi');

    const browserName = await context.getBuilderNameForTarget(browserTarget);
    const browserOptions = (await context.validateOptions(
      { ...rawBrowserOptions, ...overrides },
      browserName,
    )) as json.JsonObject & BrowserBuilderSchema;

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
        getCompilerConfig(wco),
        browserOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
      ],
      devServerOptions,
    );

    if (!config.devServer) {
      throw new Error('Webpack Dev Server configuration was not set.');
    }

    if (options.liveReload && !options.hmr) {
      // This is needed because we cannot use the inline option directly in the config
      // because of the SuppressExtractedTextChunksWebpackPlugin
      // Consider not using SuppressExtractedTextChunksWebpackPlugin when liveReload is enable.
      // tslint:disable-next-line: no-any
      webpackDevServer.addDevServerEntrypoints(config as any, {
        ...config.devServer,
        inline: true,
      });

      // Remove live-reload code from all entrypoints but not main.
      // Otherwise this will break SuppressExtractedTextChunksWebpackPlugin because
      // 'addDevServerEntrypoints' adds addional entry-points to all entries.
      if (
        config.entry &&
        typeof config.entry === 'object' &&
        !Array.isArray(config.entry) &&
        config.entry.main
      ) {
        for (const [key, value] of Object.entries(config.entry)) {
          if (key === 'main' || !Array.isArray(value)) {
            continue;
          }

          const webpackClientScriptIndex = value.findIndex((x) =>
            x.includes('webpack-dev-server/client/index.js'),
          );
          if (webpackClientScriptIndex >= 0) {
            // Remove the webpack-dev-server/client script from array.
            value.splice(webpackClientScriptIndex, 1);
          }
        }
      }
    }

    if (options.hmr) {
      logger.warn(tags.stripIndents`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.
      See https://webpack.js.org/guides/hot-module-replacement for information on working with HMR for Webpack.`);
    }

    if (
      options.host &&
      !/^127\.\d+\.\d+\.\d+/g.test(options.host) &&
      options.host !== 'localhost'
    ) {
      logger.warn(tags.stripIndent`
        Warning: This is a simple server for use in testing or debugging Angular applications
        locally. It hasn't been reviewed for security issues.

        Binding this server to an open connection can result in compromising your application or
        computer. Using a different host than the one passed to the "--host" flag might result in
        websocket connection issues. You might need to use "--disableHostCheck" if that's the
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
      // Only supported with Ivy
      const tsConfig = readTsconfig(browserOptions.tsConfig, workspaceRoot);
      if (tsConfig.options.enableIvy !== false) {
        if (i18n.inlineLocales.size > 1) {
          throw new Error(
            'The development server only supports localizing a single locale per build.',
          );
        }

        await setupLocalize(locale, i18n, browserOptions, webpackConfig);
      }
    }

    if (transforms.webpackConfiguration) {
      webpackConfig = await transforms.webpackConfiguration(webpackConfig);
    }

    return {
      browserOptions,
      webpackConfig,
      projectRoot,
      locale,
    };
  }

  return from(setup()).pipe(
    switchMap(({ browserOptions, webpackConfig, projectRoot, locale }) => {
      const normalizedOptimization = normalizeOptimization(browserOptions.optimization);

      if (browserOptions.index) {
        const { scripts = [], styles = [], baseHref, tsConfig } = browserOptions;
        const { options: compilerOptions } = readTsconfig(tsConfig, workspaceRoot);
        const target = compilerOptions.target || ts.ScriptTarget.ES5;
        const buildBrowserFeatures = new BuildBrowserFeatures(projectRoot);

        const entrypoints = generateEntryPoints({ scripts, styles });
        const moduleEntrypoints = buildBrowserFeatures.isDifferentialLoadingNeeded(target)
          ? generateEntryPoints({ scripts: [], styles })
          : [];

        webpackConfig.plugins = [...(webpackConfig.plugins || [])];
        webpackConfig.plugins.push(
          new IndexHtmlWebpackPlugin({
            indexPath: path.resolve(workspaceRoot, getIndexInputFile(browserOptions.index)),
            outputPath: getIndexOutputFile(browserOptions.index),
            baseHref,
            entrypoints,
            moduleEntrypoints,
            noModuleEntrypoints: ['polyfills-es5'],
            deployUrl: browserOptions.deployUrl,
            sri: browserOptions.subresourceIntegrity,
            postTransform: transforms.indexHtml,
            optimization: normalizedOptimization,
            WOFFSupportNeeded: !buildBrowserFeatures.isFeatureSupported('woff2'),
            crossOrigin: browserOptions.crossOrigin,
            lang: locale,
          }),
        );
      }

      if (normalizedOptimization.scripts || normalizedOptimization.styles.minify) {
        logger.error(tags.stripIndents`
          ****************************************************************************************
          This is a simple server for use in testing or debugging Angular applications locally.
          It hasn't been reviewed for security issues.

          DON'T USE IT FOR PRODUCTION!
          ****************************************************************************************
        `);
      }

      return runWebpackDevServer(webpackConfig, context, {
        logging: transforms.logging || createWebpackLoggingCallback(!!options.verbose, logger),
        webpackFactory: require('webpack') as typeof webpack,
        webpackDevServerFactory: require('webpack-dev-server') as typeof webpackDevServer,
      }).pipe(
        concatMap(async (buildEvent, index) => {
          // Resolve serve address.
          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            pathname: webpackConfig.devServer?.publicPath,
            port: buildEvent.port,
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
              const open = await import('open');
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
    test: /\.(?:[cm]?js|ts)$/,
    enforce: 'post',
    use: [
      {
        loader: require.resolve('../babel/webpack-loader'),
        options: {
          cacheDirectory: findCachePath('babel-dev-server-i18n'),
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
