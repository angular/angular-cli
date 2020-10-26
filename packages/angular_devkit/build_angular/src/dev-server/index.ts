/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as path from 'path';
import { Observable, from, of } from 'rxjs';
import { concatMap, switchMap } from 'rxjs/operators';
import * as ts from 'typescript';
import * as url from 'url';
import * as webpack from 'webpack';
import * as webpackDevServer from 'webpack-dev-server';
import { getAnalyticsConfig, getCompilerConfig } from '../browser';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { BuildBrowserFeatures, normalizeOptimization } from '../utils';
import { findCachePath } from '../utils/cache-path';
import { checkPort } from '../utils/check-port';
import { I18nOptions } from '../utils/i18n-options';
import { getHtmlTransforms } from '../utils/index-file/transforms';
import { IndexHtmlTransform } from '../utils/index-file/write-index-html';
import { generateEntryPoints } from '../utils/package-chunk-sort';
import { createI18nPlugins } from '../utils/process-bundle';
import { readTsconfig } from '../utils/read-tsconfig';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateI18nBrowserWebpackConfigFromContext, getIndexInputFile, getIndexOutputFile } from '../utils/webpack-browser-config';
import { addError, addWarning } from '../utils/webpack-diagnostics';
import { getBrowserConfig, getCommonConfig, getStatsConfig, getStylesConfig, getWorkerConfig } from '../webpack/configs';
import { getDevServerConfig } from '../webpack/configs/dev-server';
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

export type DevServerBuilderOutput = DevServerBuildOutput & {
  baseUrl: string;
};

/**
 * Reusable implementation of the build angular webpack dev server builder.
 * @param options Dev Server options.
 * @param context The build context.
 * @param transforms A map of transforms that can be used to hook into some logic (such as
 *     transforming webpack configuration before passing it to webpack).
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
  const host = new NodeJsSyncHost();

  async function setup(): Promise<{
    browserOptions: json.JsonObject & BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
    projectRoot: string;
    locale: string | undefined;
  }> {
    // Get the browser configuration from the target name.
    const rawBrowserOptions = await context.getTargetOptions(browserTarget);
    options.port = await checkPort(options.port ?? 4200, options.host || 'localhost');

    // Override options we need to override, if defined.
    const overrides = (Object.keys(options) as (keyof DevServerBuilderOptions)[])
      .filter(key => options[key] !== undefined && devServerBuildOverriddenKeys.includes(key))
      .reduce<json.JsonObject & Partial<BrowserBuilderSchema>>(
        (previous, key) => ({
          ...previous,
          [key]: options[key],
        }),
        {},
      );

    // Get dev-server only options.
    const devServerOptions = (Object.keys(options) as (keyof Schema)[])
      .filter(key => !devServerBuildOverriddenKeys.includes(key) && key !== 'browserTarget')
      .reduce<Partial<Schema>>(
        (previous, key) => ({
          ...previous,
          [key]: options[key],
        }),
        {},
      );

    // In dev server we should not have budgets because of extra libs such as socks-js
    overrides.budgets = undefined;

    const browserName = await context.getBuilderNameForTarget(browserTarget);
    const browserOptions = await context.validateOptions<json.JsonObject & BrowserBuilderSchema>(
      { ...rawBrowserOptions, ...overrides },
      browserName,
    );

    const { config, projectRoot, i18n } = await generateI18nBrowserWebpackConfigFromContext(
      browserOptions,
      context,
      wco => [
        getDevServerConfig(wco),
        getCommonConfig(wco),
        getBrowserConfig(wco),
        getStylesConfig(wco),
        getStatsConfig(wco),
        getAnalyticsConfig(wco, context),
        getCompilerConfig(wco),
        browserOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
      ],
      host,
      devServerOptions,
    );

    if (!config.devServer) {
      throw new Error(
        'Webpack Dev Server configuration was not set.',
      );
    }

    if (options.liveReload && !options.hmr) {
      // This is needed because we cannot use the inline option directly in the config
      // because of the SuppressExtractedTextChunksWebpackPlugin
      // Consider not using SuppressExtractedTextChunksWebpackPlugin when liveReload is enable.
      webpackDevServer.addDevServerEntrypoints(config, {
        ...config.devServer,
        inline: true,
      });

      // Remove live-reload code from all entrypoints but not main.
      // Otherwise this will break SuppressExtractedTextChunksWebpackPlugin because
      // 'addDevServerEntrypoints' adds addional entry-points to all entries.
      if (config.entry && typeof config.entry === 'object' && !Array.isArray(config.entry) && config.entry.main) {
        for (const [key, value] of Object.entries(config.entry)) {
          if (key === 'main' || typeof value === 'string') {
            continue;
          }

          const webpackClientScriptIndex = value.findIndex(x => x.includes('webpack-dev-server/client/index.js'));
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
      options.host
      && !/^127\.\d+\.\d+\.\d+/g.test(options.host)
      && options.host !== 'localhost'
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

    let webpackConfig = config;
    const tsConfig = readTsconfig(browserOptions.tsConfig, workspaceRoot);
    if (i18n.shouldInline && tsConfig.options.enableIvy !== false) {
      if (i18n.inlineLocales.size > 1) {
        throw new Error(
          'The development server only supports localizing a single locale per build.',
        );
      }

      await setupLocalize(i18n, browserOptions, webpackConfig);
    }

    if (transforms.webpackConfiguration) {
      webpackConfig = await transforms.webpackConfiguration(webpackConfig);
    }

    return {
      browserOptions,
      webpackConfig,
      projectRoot,
      locale:
        browserOptions.i18nLocale || (i18n.shouldInline ? [...i18n.inlineLocales][0] : undefined),
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
            input: path.resolve(workspaceRoot, getIndexInputFile(browserOptions.index)),
            output: getIndexOutputFile(browserOptions.index),
            baseHref,
            moduleEntrypoints,
            entrypoints,
            deployUrl: browserOptions.deployUrl,
            sri: browserOptions.subresourceIntegrity,
            noModuleEntrypoints: ['polyfills-es5'],
            postTransforms: getHtmlTransforms(
              normalizedOptimization,
              buildBrowserFeatures,
              transforms.indexHtml,
            ),
            crossOrigin: browserOptions.crossOrigin,
            lang: locale,
          }),
        );
      }

      if (normalizedOptimization.scripts || normalizedOptimization.styles) {
        logger.error(tags.stripIndents`
          ****************************************************************************************
          This is a simple server for use in testing or debugging Angular applications locally.
          It hasn't been reviewed for security issues.

          DON'T USE IT FOR PRODUCTION!
          ****************************************************************************************
        `);
      }

      return runWebpackDevServer(
        webpackConfig,
        context,
        {
          logging: transforms.logging || createWebpackLoggingCallback(!!options.verbose, logger),
          webpackFactory: require('webpack') as typeof webpack,
          webpackDevServerFactory: require('webpack-dev-server') as typeof webpackDevServer,
        },
      ).pipe(
        concatMap((buildEvent, index) => {
          // Resolve serve address.
          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            pathname: webpackConfig.devServer?.publicPath,
            port: buildEvent.port,
          });

          if (index === 0) {
            logger.info(tags.oneLine`
              **
              Angular Live Development Server is listening on ${options.host}:${buildEvent.port},
              open your browser on ${serverAddress}
              **
            `);

            if (options.open) {
              const open = require('open');
              open(serverAddress);
            }
          }

          if (buildEvent.success) {
            logger.info(': Compiled successfully.');
          }

          return of({ ...buildEvent, baseUrl: serverAddress } as DevServerBuilderOutput);
        }),
      );
    }),
  );
}

async function setupLocalize(
  i18n: I18nOptions,
  browserOptions: BrowserBuilderSchema,
  webpackConfig: webpack.Configuration,
) {
  const locale = [...i18n.inlineLocales][0];
  const localeDescription = i18n.locales[locale];
  const { plugins, diagnostics } = await createI18nPlugins(
    locale,
    localeDescription?.translation,
    browserOptions.i18nMissingTranslation || 'ignore',
  );

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
      webpackConfig.entry['main'] = [localeDescription.dataPath, webpackConfig.entry['main']];
    }
  }

  const i18nRule: webpack.RuleSetRule = {
    test: /\.(?:m?js|ts)$/,
    enforce: 'post',
    use: [
      {
        loader: require.resolve('babel-loader'),
        options: {
          babelrc: false,
          configFile: false,
          compact: false,
          cacheCompression: false,
          cacheDirectory: findCachePath('babel-loader'),
          cacheIdentifier: JSON.stringify({
            buildAngular: require('../../package.json').version,
            locale,
            translationIntegrity: localeDescription?.files.map((file) => file.integrity),
          }),
          plugins,
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

  // Add a plugin to inject the i18n diagnostics
  // tslint:disable-next-line: no-non-null-assertion
  webpackConfig.plugins!.push({
    apply: (compiler: webpack.Compiler) => {
      compiler.hooks.thisCompilation.tap('build-angular', compilation => {
        compilation.hooks.finishModules.tap('build-angular', () => {
          if (!diagnostics) {
            return;
          }
          for (const diagnostic of diagnostics.messages) {
            if (diagnostic.type === 'error') {
              addError(compilation, diagnostic.message);
            } else {
              addWarning(compilation, diagnostic.message);
            }
          }
          diagnostics.messages.length = 0;
        });
      });
    },
  });
}

export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(serveWebpackBrowser);
