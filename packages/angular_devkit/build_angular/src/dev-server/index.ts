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
import { json, logging, tags } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import * as ts from 'typescript';
import * as url from 'url';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { buildBrowserWebpackConfigFromContext } from '../browser';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { BuildBrowserFeatures, normalizeOptimization } from '../utils';
import { findCachePath } from '../utils/cache-path';
import { checkPort } from '../utils/check-port';
import { I18nOptions } from '../utils/i18n-options';
import { IndexHtmlTransform } from '../utils/index-file/write-index-html';
import { generateEntryPoints } from '../utils/package-chunk-sort';
import { createI18nPlugins } from '../utils/process-bundle';
import { readTsconfig } from '../utils/read-tsconfig';
import { assertCompatibleAngularVersion } from '../utils/version';
import { getIndexInputFile, getIndexOutputFile } from '../utils/webpack-browser-config';
import { addError, addWarning } from '../utils/webpack-diagnostics';
import { normalizeExtraEntryPoints } from '../webpack/configs';
import { IndexHtmlWebpackPlugin } from '../webpack/plugins/index-html-webpack-plugin';
import { createWebpackLoggingCallback } from '../webpack/utils/stats';
import { Schema } from './schema';
const open = require('open');

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
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  const browserTarget = targetFromTargetString(options.browserTarget);
  const root = context.workspaceRoot;
  let first = true;
  const host = new NodeJsSyncHost();

  async function setup(): Promise<{
    browserOptions: json.JsonObject & BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
    webpackDevServerConfig: WebpackDevServer.Configuration;
    projectRoot: string;
  }> {
    // Get the browser configuration from the target name.
    const rawBrowserOptions = await context.getTargetOptions(browserTarget);

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

    // In dev server we should not have budgets because of extra libs such as socks-js
    overrides.budgets = undefined;

    const browserName = await context.getBuilderNameForTarget(browserTarget);
    const browserOptions = await context.validateOptions<json.JsonObject & BrowserBuilderSchema>(
      { ...rawBrowserOptions, ...overrides },
      browserName,
    );

    const { config, projectRoot, i18n } = await buildBrowserWebpackConfigFromContext(
      browserOptions,
      context,
      host,
    );
    let webpackConfig = config;

    const tsConfig = readTsconfig(browserOptions.tsConfig, context.workspaceRoot);
    if (i18n.shouldInline && tsConfig.options.enableIvy !== false) {
      if (i18n.inlineLocales.size > 1) {
        throw new Error(
          'The development server only supports localizing a single locale per build',
        );
      }

      await setupLocalize(i18n, browserOptions, webpackConfig);
    }

    options.port = await checkPort(options.port ?? 4200, options.host || 'localhost');
    const webpackDevServerConfig = (webpackConfig.devServer = buildServerConfig(
      root,
      options,
      browserOptions,
      context.logger,
    ));

    if (transforms.webpackConfiguration) {
      webpackConfig = await transforms.webpackConfiguration(webpackConfig);
    }

    return {
      browserOptions,
      webpackConfig,
      webpackDevServerConfig,
      projectRoot,
    };
  }

  return from(setup()).pipe(
    switchMap(({ browserOptions, webpackConfig, webpackDevServerConfig, projectRoot }) => {
      // Resolve public host and client address.
      let clientAddress = url.parse(`${options.ssl ? 'https' : 'http'}://0.0.0.0:0`);
      if (options.publicHost) {
        let publicHost = options.publicHost;
        if (!/^\w+:\/\//.test(publicHost)) {
          publicHost = `${options.ssl ? 'https' : 'http'}://${publicHost}`;
        }
        clientAddress = url.parse(publicHost);
        options.publicHost = clientAddress.host;
      }

      // Add live reload config.
      if (options.liveReload) {
        _addLiveReload(root, options, browserOptions, webpackConfig, clientAddress, context.logger);
      } else if (options.hmr) {
        context.logger.warn('Live reload is disabled. HMR option ignored.');
      }

      webpackConfig.plugins = [...(webpackConfig.plugins || [])];

      if (!options.watch) {
        // There's no option to turn off file watching in webpack-dev-server, but
        // we can override the file watcher instead.
        webpackConfig.plugins.push({
          // tslint:disable-next-line:no-any
          apply: (compiler: any) => {
            compiler.hooks.afterEnvironment.tap('angular-cli', () => {
              compiler.watchFileSystem = { watch: () => {} };
            });
          },
        });
      }

      if (browserOptions.index) {
        const { scripts = [], styles = [], baseHref, tsConfig } = browserOptions;
        const { options: compilerOptions } = readTsconfig(tsConfig, context.workspaceRoot);
        const target = compilerOptions.target || ts.ScriptTarget.ES5;
        const buildBrowserFeatures = new BuildBrowserFeatures(projectRoot);

        const entrypoints = generateEntryPoints({ scripts, styles });
        const moduleEntrypoints = buildBrowserFeatures.isDifferentialLoadingNeeded(target)
          ? generateEntryPoints({ scripts: [], styles })
          : [];

        webpackConfig.plugins.push(
          new IndexHtmlWebpackPlugin({
            input: path.resolve(root, getIndexInputFile(browserOptions)),
            output: getIndexOutputFile(browserOptions),
            baseHref,
            moduleEntrypoints,
            entrypoints,
            deployUrl: browserOptions.deployUrl,
            sri: browserOptions.subresourceIntegrity,
            noModuleEntrypoints: ['polyfills-es5'],
            postTransform: transforms.indexHtml,
            crossOrigin: browserOptions.crossOrigin,
            lang: browserOptions.i18nLocale,
          }),
        );
      }

      const normalizedOptimization = normalizeOptimization(browserOptions.optimization);
      if (normalizedOptimization.scripts || normalizedOptimization.styles) {
        context.logger.error(tags.stripIndents`
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
          logging: transforms.logging || createWebpackLoggingCallback(!!options.verbose, context.logger),
          webpackFactory: require('webpack') as typeof webpack,
          webpackDevServerFactory: require('webpack-dev-server') as typeof WebpackDevServer,
        },
      ).pipe(
        map(buildEvent => {
          // Resolve serve address.
          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            pathname: webpackDevServerConfig.publicPath,
            port: buildEvent.port,
          });

          if (first) {
            first = false;
            context.logger.info(tags.oneLine`
              **
              Angular Live Development Server is listening on ${options.host}:${buildEvent.port},
              open your browser on ${serverAddress}
              **
            `);

            if (options.open) {
              open(serverAddress);
            }
          }

          if (buildEvent.success) {
            context.logger.info(': Compiled successfully.');
          }

          return { ...buildEvent, baseUrl: serverAddress } as DevServerBuilderOutput;
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

/**
 * Create a webpack configuration for the dev server.
 * @param workspaceRoot The root of the workspace. This comes from the context.
 * @param serverOptions DevServer options, based on the dev server input schema.
 * @param browserOptions Browser builder options. See the browser builder from this package.
 * @param logger A generic logger to use for showing warnings.
 * @returns A webpack dev-server configuration.
 */
export function buildServerConfig(
  workspaceRoot: string,
  serverOptions: DevServerBuilderOptions,
  browserOptions: BrowserBuilderSchema,
  logger: logging.LoggerApi,
): WebpackDevServer.Configuration {
  // Check that the host is either localhost or prints out a message.
  if (
    serverOptions.host
    && !/^127\.\d+\.\d+\.\d+/g.test(serverOptions.host)
    && serverOptions.host !== 'localhost'
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

  if (serverOptions.disableHostCheck) {
    logger.warn(tags.oneLine`
        Warning: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
  }

  const servePath = buildServePath(serverOptions, browserOptions, logger);
  const { styles, scripts } = normalizeOptimization(browserOptions.optimization);

  const config: WebpackDevServer.Configuration & { logLevel: string } = {
    host: serverOptions.host,
    port: serverOptions.port,
    headers: { 'Access-Control-Allow-Origin': '*' },
    historyApiFallback: !!browserOptions.index && {
      index: `${servePath}/${getIndexOutputFile(browserOptions)}`,
      disableDotRule: true,
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      rewrites: [
        {
          from: new RegExp(`^(?!${servePath})/.*`),
          to: context => url.format(context.parsedUrl),
        },
      ],
    },
    stats: false,
    compress: styles || scripts,
    watchOptions: {
      // Using just `--poll` will result in a value of 0 which is very likely not the intention
      // A value of 0 is falsy and will disable polling rather then enable
      // 500 ms is a sensible default in this case
      poll: serverOptions.poll === 0 ? 500 : serverOptions.poll,
      ignored: serverOptions.poll === undefined ? undefined : /[\\\/]node_modules[\\\/]/,
    },
    https: serverOptions.ssl,
    overlay: {
      errors: !(styles || scripts),
      warnings: false,
    },
    // inline is always false, because we add live reloading scripts in _addLiveReload when needed
    inline: false,
    public: serverOptions.publicHost,
    allowedHosts: serverOptions.allowedHosts,
    disableHostCheck: serverOptions.disableHostCheck,
    publicPath: servePath,
    hot: serverOptions.hmr,
    contentBase: false,
    logLevel: 'silent',
  };

  if (serverOptions.ssl) {
    _addSslConfig(workspaceRoot, serverOptions, config);
  }

  if (serverOptions.proxyConfig) {
    _addProxyConfig(workspaceRoot, serverOptions, config);
  }

  return config;
}

/**
 * Resolve and build a URL _path_ that will be the root of the server. This resolved base href and
 * deploy URL from the browser options and returns a path from the root.
 * @param serverOptions The server options that were passed to the server builder.
 * @param browserOptions The browser options that were passed to the browser builder.
 * @param logger A generic logger to use for showing warnings.
 */
export function buildServePath(
  serverOptions: DevServerBuilderOptions,
  browserOptions: BrowserBuilderSchema,
  logger: logging.LoggerApi,
): string {
  let servePath = serverOptions.servePath;
  if (!servePath && servePath !== '') {
    const defaultPath = _findDefaultServePath(browserOptions.baseHref, browserOptions.deployUrl);
    if (defaultPath == null) {
      logger.warn(tags.oneLine`
        Warning: --deploy-url and/or --base-href contain unsupported values for ng serve. Default
        serve path of '/' used. Use --serve-path to override.
      `);
    }
    servePath = defaultPath || '';
  }
  if (servePath.endsWith('/')) {
    servePath = servePath.substr(0, servePath.length - 1);
  }
  if (!servePath.startsWith('/')) {
    servePath = `/${servePath}`;
  }

  return servePath;
}

/**
 * Private method to enhance a webpack config with live reload configuration.
 * @private
 */
function _addLiveReload(
  root: string,
  options: DevServerBuilderOptions,
  browserOptions: BrowserBuilderSchema,
  webpackConfig: webpack.Configuration,
  clientAddress: url.UrlWithStringQuery,
  logger: logging.LoggerApi,
) {
  if (webpackConfig.plugins === undefined) {
    webpackConfig.plugins = [];
  }

  // Workaround node shim hoisting issues with live reload client
  // Only needed in dev server mode to support live reload capabilities in all package managers
  // Not needed in Webpack 5 - node-libs-browser will not be present in webpack 5
  let nodeLibsBrowserPath;
  try {
    const webpackPath = path.dirname(require.resolve('webpack/package.json'));
    nodeLibsBrowserPath = require.resolve('node-libs-browser', { paths: [webpackPath] });
  } catch {}
  if (nodeLibsBrowserPath) {
    const nodeLibsBrowser = require(nodeLibsBrowserPath);
    webpackConfig.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^events|url|querystring$/,
        (resource: { issuer?: string; request: string }) => {
          if (!resource.issuer) {
            return;
          }
          if (/[\/\\]hot[\/\\]emitter\.js$/.test(resource.issuer)) {
            if (resource.request === 'events') {
              resource.request = nodeLibsBrowser.events;
            }
          } else if (
            /[\/\\]webpack-dev-server[\/\\]client[\/\\]utils[\/\\]createSocketUrl\.js$/.test(
              resource.issuer,
            )
          ) {
            switch (resource.request) {
              case 'url':
                resource.request = nodeLibsBrowser.url;
                break;
              case 'querystring':
                resource.request = nodeLibsBrowser.querystring;
                break;
            }
          }
        },
      ),
    );
  }

  // This allows for live reload of page when changes are made to repo.
  // https://webpack.js.org/configuration/dev-server/#devserver-inline
  let webpackDevServerPath;
  try {
    webpackDevServerPath = require.resolve('webpack-dev-server/client');
  } catch {
    throw new Error('The "webpack-dev-server" package could not be found.');
  }

  // If a custom path is provided the webpack dev server client drops the sockjs-node segment.
  // This adds it back so that behavior is consistent when using a custom URL path
  let sockjsPath = '';
  if (clientAddress.pathname) {
    clientAddress.pathname = path.posix.join(clientAddress.pathname, 'sockjs-node');
    sockjsPath = '&sockPath=' + clientAddress.pathname;
  }

  const entryPoints = [`${webpackDevServerPath}?${url.format(clientAddress)}${sockjsPath}`];
  if (options.hmr) {
    logger.warn(tags.stripIndents`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.
      See https://webpack.js.org/guides/hot-module-replacement for information on working with HMR for Webpack.`);

    entryPoints.push(
      'webpack/hot/dev-server',
      path.join(__dirname, '../webpack/hmr.js'),
    );

    if (browserOptions.styles?.length) {
      // When HMR is enabled we need to add the css paths as part of the entrypoints
      // because otherwise no JS bundle will contain the HMR accept code.
      const normalizedStyles = normalizeExtraEntryPoints(browserOptions.styles, 'styles')
        .map(style => {
          let resolvedPath = path.resolve(root, style.input);
          if (!existsSync(resolvedPath)) {
            try {
              resolvedPath = require.resolve(style.input, { paths: [root] });
            } catch {}
          }

          return resolvedPath;
        });
      entryPoints.push(...normalizedStyles);
    }

    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
  }
  if (typeof webpackConfig.entry !== 'object' || Array.isArray(webpackConfig.entry)) {
    webpackConfig.entry = {};
  }
  if (!Array.isArray(webpackConfig.entry.main)) {
    webpackConfig.entry.main = [];
  }
  webpackConfig.entry.main.unshift(...entryPoints);
}

/**
 * Private method to enhance a webpack config with SSL configuration.
 * @private
 */
function _addSslConfig(
  root: string,
  options: DevServerBuilderOptions,
  config: WebpackDevServer.Configuration,
) {
  let sslKey: string | undefined = undefined;
  let sslCert: string | undefined = undefined;
  if (options.sslKey) {
    const keyPath = path.resolve(root, options.sslKey);
    if (existsSync(keyPath)) {
      sslKey = readFileSync(keyPath, 'utf-8');
    }
  }
  if (options.sslCert) {
    const certPath = path.resolve(root, options.sslCert);
    if (existsSync(certPath)) {
      sslCert = readFileSync(certPath, 'utf-8');
    }
  }

  config.https = true;
  if (sslKey != null && sslCert != null) {
    config.https = {
      key: sslKey,
      cert: sslCert,
    };
  }
}

/**
 * Private method to enhance a webpack config with Proxy configuration.
 * @private
 */
function _addProxyConfig(
  root: string,
  options: DevServerBuilderOptions,
  config: WebpackDevServer.Configuration,
) {
  let proxyConfig = {};
  const proxyPath = path.resolve(root, options.proxyConfig as string);
  if (existsSync(proxyPath)) {
    proxyConfig = require(proxyPath);
  } else {
    const message = 'Proxy config file ' + proxyPath + ' does not exist.';
    throw new Error(message);
  }
  config.proxy = proxyConfig;
}

/**
 * Find the default server path. We don't want to expose baseHref and deployUrl as arguments, only
 * the browser options where needed. This method should stay private (people who want to resolve
 * baseHref and deployUrl should use the buildServePath exported function.
 * @private
 */
function _findDefaultServePath(baseHref?: string, deployUrl?: string): string | null {
  if (!baseHref && !deployUrl) {
    return '';
  }

  if (/^(\w+:)?\/\//.test(baseHref || '') || /^(\w+:)?\/\//.test(deployUrl || '')) {
    // If baseHref or deployUrl is absolute, unsupported by ng serve
    return null;
  }

  // normalize baseHref
  // for ng serve the starting base is always `/` so a relative
  // and root relative value are identical
  const baseHrefParts = (baseHref || '').split('/').filter(part => part !== '');
  if (baseHref && !baseHref.endsWith('/')) {
    baseHrefParts.pop();
  }
  const normalizedBaseHref = baseHrefParts.length === 0 ? '/' : `/${baseHrefParts.join('/')}/`;

  if (deployUrl && deployUrl[0] === '/') {
    if (baseHref && baseHref[0] === '/' && normalizedBaseHref !== deployUrl) {
      // If baseHref and deployUrl are root relative and not equivalent, unsupported by ng serve
      return null;
    }

    return deployUrl;
  }

  // Join together baseHref and deployUrl
  return `${normalizedBaseHref}${deployUrl || ''}`;
}

export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(serveWebpackBrowser);
