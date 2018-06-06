/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { WebpackDevServerBuilder } from '@angular-devkit/build-webpack';
import { Path, getSystemPath, resolve, tags, virtualFs } from '@angular-devkit/core';
import { existsSync, readFileSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, throwError } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import * as url from 'url';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { checkPort } from '../angular-cli-files/utilities/check-port';
import { BrowserBuilder, NormalizedBrowserBuilderSchema, getBrowserLoggingCb } from '../browser/';
import { BrowserBuilderSchema } from '../browser/schema';
import { addFileReplacements, normalizeAssetPatterns } from '../utils';
const opn = require('opn');


export interface DevServerBuilderOptions {
  browserTarget: string;
  port: number;
  host: string;
  proxyConfig?: string;
  ssl: boolean;
  sslKey?: string;
  sslCert?: string;
  open: boolean;
  liveReload: boolean;
  publicHost?: string;
  servePath?: string;
  disableHostCheck: boolean;
  hmr: boolean;
  watch: boolean;
  hmrWarning: boolean;
  servePathDefaultWarning: boolean;

  // These options come from the browser builder and are provided here for convenience.
  optimization?: boolean;
  aot?: boolean;
  sourceMap?: boolean;
  evalSourceMap?: boolean;
  vendorChunk?: boolean;
  commonChunk?: boolean;
  baseHref?: string;
  progress?: boolean;
  poll?: number;
}


export class DevServerBuilder implements Builder<DevServerBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
    let browserOptions: BrowserBuilderSchema;
    let first = true;
    let opnAddress: string;

    return checkPort(options.port, options.host).pipe(
      tap((port) => options.port = port),
      concatMap(() => this._getBrowserOptions(options)),
      tap((opts) => browserOptions = opts),
      concatMap(() => addFileReplacements(root, host, browserOptions.fileReplacements)),
      concatMap(() => normalizeAssetPatterns(
        browserOptions.assets, host, root, projectRoot, builderConfig.sourceRoot)),
      // Replace the assets in options with the normalized version.
      tap((assetPatternObjects => browserOptions.assets = assetPatternObjects)),
      concatMap(() => {
        const browserBuilder = new BrowserBuilder(this.context);
        const webpackConfig = browserBuilder.buildWebpackConfig(
          root, projectRoot, host, browserOptions as NormalizedBrowserBuilderSchema);

        let webpackDevServerConfig: WebpackDevServer.Configuration;
        try {
          webpackDevServerConfig = this._buildServerConfig(
            root, projectRoot, options, browserOptions);
        } catch (err) {
          return throwError(err);
        }

        // Resolve public host and client address.
        let clientAddress = `${options.ssl ? 'https' : 'http'}://0.0.0.0:0`;
        if (options.publicHost) {
          let publicHost = options.publicHost;
          if (!/^\w+:\/\//.test(publicHost)) {
            publicHost = `${options.ssl ? 'https' : 'http'}://${publicHost}`;
          }
          const clientUrl = url.parse(publicHost);
          options.publicHost = clientUrl.host;
          clientAddress = url.format(clientUrl);
        }

        // Resolve serve address.
        const serverAddress = url.format({
          protocol: options.ssl ? 'https' : 'http',
          hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
          port: options.port.toString(),
        });

        // Add live reload config.
        if (options.liveReload) {
          this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
        } else if (options.hmr) {
          this.context.logger.warn('Live reload is disabled. HMR option ignored.');
        }

        if (!options.watch) {
          // There's no option to turn off file watching in webpack-dev-server, but
          // we can override the file watcher instead.
          webpackConfig.plugins.unshift({
            // tslint:disable-next-line:no-any
            apply: (compiler: any) => {
              compiler.hooks.afterEnvironment.tap('angular-cli', () => {
                compiler.watchFileSystem = { watch: () => { } };
              });
            },
          });
        }

        if (browserOptions.optimization) {
          this.context.logger.error(tags.stripIndents`
            ****************************************************************************************
            This is a simple server for use in testing or debugging Angular applications locally.
            It hasn't been reviewed for security issues.

            DON'T USE IT FOR PRODUCTION!
            ****************************************************************************************
          `);
        }

        this.context.logger.info(tags.oneLine`
          **
          Angular Live Development Server is listening on ${options.host}:${options.port},
          open your browser on ${serverAddress}${webpackDevServerConfig.publicPath}
          **
        `);

        opnAddress = serverAddress + webpackDevServerConfig.publicPath;
        webpackConfig.devServer = webpackDevServerConfig;

        return webpackDevServerBuilder.runWebpackDevServer(
          webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose),
        );
      }),
      map(buildEvent => {
        if (first && options.open) {
          first = false;
          opn(opnAddress);
        }

        return buildEvent;
      }),
    );
  }

  buildWebpackConfig(
    root: Path,
    projectRoot: Path,
    host: virtualFs.Host<fs.Stats>,
    browserOptions: BrowserBuilderSchema,
  ) {
    const browserBuilder = new BrowserBuilder(this.context);
    const webpackConfig = browserBuilder.buildWebpackConfig(
      root, projectRoot, host, browserOptions as NormalizedBrowserBuilderSchema);

    return webpackConfig;
  }

  private _buildServerConfig(
    root: Path,
    projectRoot: Path,
    options: DevServerBuilderOptions,
    browserOptions: BrowserBuilderSchema,
  ) {
    const systemRoot = getSystemPath(root);
    if (options.disableHostCheck) {
      this.context.logger.warn(tags.oneLine`
        WARNING: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
    }

    const servePath = this._buildServePath(options, browserOptions);

    const config: WebpackDevServer.Configuration = {
      host: options.host,
      port: options.port,
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: {
        index: `${servePath}/${path.basename(browserOptions.index)}`,
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      },
      stats: false,
      compress: browserOptions.optimization,
      watchOptions: {
        poll: browserOptions.poll,
      },
      https: options.ssl,
      overlay: {
        errors: !browserOptions.optimization,
        warnings: false,
      },
      public: options.publicHost,
      disableHostCheck: options.disableHostCheck,
      publicPath: servePath,
      hot: options.hmr,
    };

    if (options.ssl) {
      this._addSslConfig(systemRoot, options, config);
    }

    if (options.proxyConfig) {
      this._addProxyConfig(systemRoot, options, config);
    }

    return config;
  }

  private _addLiveReload(
    options: DevServerBuilderOptions,
    browserOptions: BrowserBuilderSchema,
    webpackConfig: any, // tslint:disable-line:no-any
    clientAddress: string,
  ) {
    // This allows for live reload of page when changes are made to repo.
    // https://webpack.js.org/configuration/dev-server/#devserver-inline
    let webpackDevServerPath;
    try {
      webpackDevServerPath = require.resolve('webpack-dev-server/client');
    } catch {
      throw new Error('The "webpack-dev-server" package could not be found.');
    }
    const entryPoints = [`${webpackDevServerPath}?${clientAddress}`];
    if (options.hmr) {
      const webpackHmrLink = 'https://webpack.js.org/guides/hot-module-replacement';

      this.context.logger.warn(
        tags.oneLine`NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.`);

      const showWarning = options.hmrWarning;
      if (showWarning) {
        this.context.logger.info(tags.stripIndents`
          The project will still live reload when HMR is enabled,
          but to take advantage of HMR additional application code is required'
          (not included in an Angular CLI project by default).'
          See ${webpackHmrLink}
          for information on working with HMR for Webpack.`,
        );
        this.context.logger.warn(
          tags.oneLine`To disable this warning use "hmrWarning: false" under "serve"
           options in "angular.json".`,
        );
      }
      entryPoints.push('webpack/hot/dev-server');
      webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
      if (browserOptions.extractCss) {
        this.context.logger.warn(tags.oneLine`NOTICE: (HMR) does not allow for CSS hot reload
                when used together with '--extract-css'.`);
      }
    }
    if (!webpackConfig.entry.main) { webpackConfig.entry.main = []; }
    webpackConfig.entry.main.unshift(...entryPoints);
  }

  private _addSslConfig(
    root: string,
    options: DevServerBuilderOptions,
    config: WebpackDevServer.Configuration,
  ) {
    let sslKey: string | undefined = undefined;
    let sslCert: string | undefined = undefined;
    if (options.sslKey) {
      const keyPath = path.resolve(root, options.sslKey as string);
      if (existsSync(keyPath)) {
        sslKey = readFileSync(keyPath, 'utf-8');
      }
    }
    if (options.sslCert) {
      const certPath = path.resolve(root, options.sslCert as string);
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

  private _addProxyConfig(
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

  private _buildServePath(options: DevServerBuilderOptions, browserOptions: BrowserBuilderSchema) {
    let servePath = options.servePath;
    if (!servePath && servePath !== '') {
      const defaultServePath =
        this._findDefaultServePath(browserOptions.baseHref, browserOptions.deployUrl);
      const showWarning = options.servePathDefaultWarning;
      if (defaultServePath == null && showWarning) {
        this.context.logger.warn(tags.oneLine`
            WARNING: --deploy-url and/or --base-href contain
            unsupported values for ng serve.  Default serve path of '/' used.
            Use --serve-path to override.
          `);
      }
      servePath = defaultServePath || '';
    }
    if (servePath.endsWith('/')) {
      servePath = servePath.substr(0, servePath.length - 1);
    }
    if (!servePath.startsWith('/')) {
      servePath = `/${servePath}`;
    }

    return servePath;
  }

  private _findDefaultServePath(baseHref?: string, deployUrl?: string): string | null {
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
    const baseHrefParts = (baseHref || '')
      .split('/')
      .filter(part => part !== '');
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

  private _getBrowserOptions(options: DevServerBuilderOptions) {
    const architect = this.context.architect;
    const [project, target, configuration] = options.browserTarget.split(':');

    const overrides = {
      // Override browser build watch setting.
      watch: options.watch,

      // Update the browser options with the same options we support in serve, if defined.
      ...(options.optimization !== undefined ? { optimization: options.optimization } : {}),
      ...(options.aot !== undefined ? { aot: options.aot } : {}),
      ...(options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}),
      ...(options.evalSourceMap !== undefined ? { evalSourceMap: options.evalSourceMap } : {}),
      ...(options.vendorChunk !== undefined ? { vendorChunk: options.vendorChunk } : {}),
      ...(options.commonChunk !== undefined ? { commonChunk: options.commonChunk } : {}),
      ...(options.baseHref !== undefined ? { baseHref: options.baseHref } : {}),
      ...(options.progress !== undefined ? { progress: options.progress } : {}),
      ...(options.poll !== undefined ? { poll: options.poll } : {}),
    };

    const browserTargetSpec = { project, target, configuration, overrides };
    const builderConfig = architect.getBuilderConfiguration<BrowserBuilderSchema>(
      browserTargetSpec);

    return architect.getBuilderDescription(builderConfig).pipe(
      concatMap(browserDescription =>
        architect.validateBuilderOptions(builderConfig, browserDescription)),
      map(browserConfig => browserConfig.options),
    );
  }
}

export default DevServerBuilder;
