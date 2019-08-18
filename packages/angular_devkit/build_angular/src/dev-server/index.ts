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
import {
  experimental,
  getSystemPath,
  json,
  logging,
  normalize,
  resolve,
  tags,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import * as ts from 'typescript';
import * as url from 'url';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { IndexHtmlWebpackPlugin } from '../angular-cli-files/plugins/index-html-webpack-plugin';
import { checkPort } from '../angular-cli-files/utilities/check-port';
import { IndexHtmlTransform } from '../angular-cli-files/utilities/index-file/write-index-html';
import { generateEntryPoints } from '../angular-cli-files/utilities/package-chunk-sort';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { buildBrowserWebpackConfigFromContext, createBrowserLoggingCallback } from '../browser';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { BuildBrowserFeatures, normalizeOptimization } from '../utils';
import { assertCompatibleAngularVersion } from '../utils/version';
import { getIndexInputFile, getIndexOutputFile } from '../utils/webpack-browser-config';
import { Schema } from './schema';
const open = require('open');

export type DevServerBuilderOptions = Schema & json.JsonObject;

const devServerBuildOverriddenKeys: (keyof DevServerBuilderOptions)[] = [
  'watch',
  'optimization',
  'aot',
  'sourceMap',
  'vendorSourceMap',
  'evalSourceMap',
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

  const loggingFn =
    transforms.logging || createBrowserLoggingCallback(!!options.verbose, context.logger);

  async function setup(): Promise<{
    browserOptions: json.JsonObject & BrowserBuilderSchema;
    webpackConfig: webpack.Configuration;
    webpackDevServerConfig: WebpackDevServer.Configuration;
    port: number;
    workspace: experimental.workspace.Workspace;
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

    const webpackConfigResult = await buildBrowserWebpackConfigFromContext(
      browserOptions,
      context,
      host,
    );

    // No differential loading for dev-server, hence there is just one config
    let webpackConfig = webpackConfigResult.config[0];

    const port = await checkPort(options.port || 0, options.host || 'localhost', 4200);
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
      port,
      workspace: webpackConfigResult.workspace,
    };
  }

  return from(setup()).pipe(
    switchMap(({ browserOptions, webpackConfig, webpackDevServerConfig, port, workspace }) => {
      options.port = port;

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
        _addLiveReload(options, browserOptions, webpackConfig, clientAddress, context.logger);
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
        const projectName = context.target
          ? context.target.project
          : workspace.getDefaultProjectName();

        if (!projectName) {
          throw new Error('Must either have a target from the context or a default project.');
        }
        const projectRoot = resolve(
          workspace.root,
          normalize(workspace.getProject(projectName).root),
        );

        const { options: compilerOptions } = readTsconfig(tsConfig, context.workspaceRoot);
        const target = compilerOptions.target || ts.ScriptTarget.ES5;
        const buildBrowserFeatures = new BuildBrowserFeatures(getSystemPath(projectRoot), target);

        const entrypoints = generateEntryPoints({ scripts, styles });
        const moduleEntrypoints = buildBrowserFeatures.isDifferentialLoadingNeeded()
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

      return runWebpackDevServer(webpackConfig, context, { logging: loggingFn }).pipe(
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

          return { ...buildEvent, baseUrl: serverAddress } as DevServerBuilderOutput;
        }),
      );
    }),
  );
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
        WARNING: This is a simple server for use in testing or debugging Angular applications
        locally. It hasn't been reviewed for security issues.

        Binding this server to an open connection can result in compromising your application or
        computer. Using a different host than the one passed to the "--host" flag might result in
        websocket connection issues. You might need to use "--disableHostCheck" if that's the
        case.
      `);
  }

  if (serverOptions.disableHostCheck) {
    logger.warn(tags.oneLine`
        WARNING: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
  }

  const servePath = buildServePath(serverOptions, browserOptions, logger);
  const { styles, scripts } = normalizeOptimization(browserOptions.optimization);

  const config: WebpackDevServer.Configuration = {
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
      poll: browserOptions.poll,
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
    const showWarning = serverOptions.servePathDefaultWarning;
    if (defaultPath == null && showWarning) {
      logger.warn(tags.oneLine`
        WARNING: --deploy-url and/or --base-href contain unsupported values for ng serve. Default
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
  options: DevServerBuilderOptions,
  browserOptions: BrowserBuilderSchema,
  webpackConfig: webpack.Configuration,
  clientAddress: url.UrlWithStringQuery,
  logger: logging.LoggerApi,
) {
  if (webpackConfig.plugins === undefined) {
    webpackConfig.plugins = [];
  }

  // Enable the internal node plugins but no individual shims
  // This is needed to allow module specific rules to include node shims
  // Only needed in dev server mode to support live reload capabilities in all package managers
  if (webpackConfig.node === false) {
    webpackConfig.node = {
      global: false,
      process: false,
      __filename: false,
      __dirname: false,
      Buffer: false,
      setImmediate: false,
    };
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
    const webpackHmrLink = 'https://webpack.js.org/guides/hot-module-replacement';

    logger.warn(tags.oneLine`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.`);

    const showWarning = options.hmrWarning;
    if (showWarning) {
      logger.info(tags.stripIndents`
          The project will still live reload when HMR is enabled,
          but to take advantage of HMR additional application code is required'
          (not included in an Angular CLI project by default).'
          See ${webpackHmrLink}
          for information on working with HMR for Webpack.`);
      logger.warn(
        tags.oneLine`To disable this warning use "hmrWarning: false" under "serve"
           options in "angular.json".`,
      );
    }
    entryPoints.push('webpack/hot/dev-server');
    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
    if (browserOptions.extractCss) {
      logger.warn(tags.oneLine`NOTICE: (HMR) does not allow for CSS hot reload
                when used together with '--extract-css'.`);
    }
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
