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
import { Stats, existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { Observable, from, throwError } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import * as url from 'url';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { checkPort } from '../angular-cli-files/utilities/check-port';
import { BrowserBuilder, getBrowserLoggingCb } from '../browser';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import {
  NormalizedBrowserBuilderSchema,
  normalizeBrowserSchema,
} from '../utils';
import { Schema as DevServerBuilderSchema } from './schema';
const opn = require('opn');


type DevServerBuilderSchemaKeys = Extract<keyof DevServerBuilderSchema, string>;

export class DevServerBuilder implements Builder<DevServerBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<DevServerBuilderSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<Stats>);
    const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
    let browserOptions: NormalizedBrowserBuilderSchema;
    let first = true;
    let opnAddress: string;

    return from(checkPort(options.port || 0, options.host || 'localhost', 4200)).pipe(
      tap((port) => options.port = port),
      concatMap(() => this._getBrowserOptions(options)),
      tap(opts => browserOptions = normalizeBrowserSchema(
        host,
        root,
        resolve(root, builderConfig.root),
        builderConfig.sourceRoot,
        opts.options,
      )),
      concatMap(() => {
        const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);

        let webpackDevServerConfig: WebpackDevServer.Configuration;
        try {
          webpackDevServerConfig = this._buildServerConfig(
            root,
            options,
            browserOptions,
          );
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
          // Port cannot be undefined here since we have a step that sets it back in options above.
          // tslint:disable-next-line:no-non-null-assertion
          port: options.port !.toString(),
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

        if (browserOptions.optimization.scripts || browserOptions.optimization.styles) {
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
          webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose || false),
        );
      }),
      map(buildEvent => {
        if (first && options.open) {
          first = false;
          opn(opnAddress);
        }

        return buildEvent;
      }),
      // using more than 10 operators will cause rxjs to loose the types
    ) as Observable<BuildEvent>;
  }

  buildWebpackConfig(
    root: Path,
    projectRoot: Path,
    host: virtualFs.Host<Stats>,
    browserOptions: NormalizedBrowserBuilderSchema,
  ) {
    const browserBuilder = new BrowserBuilder(this.context);

    return browserBuilder.buildWebpackConfig(root, projectRoot, host, browserOptions);
  }

  private _buildServerConfig(
    root: Path,
    options: DevServerBuilderSchema,
    browserOptions: NormalizedBrowserBuilderSchema,
  ) {
    const systemRoot = getSystemPath(root);
    if (options.host) {
      // Check that the host is either localhost or prints out a message.
      if (!/^127\.\d+\.\d+\.\d+/g.test(options.host) && options.host !== 'localhost') {
        this.context.logger.warn(tags.stripIndent`
          WARNING: This is a simple server for use in testing or debugging Angular applications
          locally. It hasn't been reviewed for security issues.

          Binding this server to an open connection can result in compromising your application or
          computer. Using a different host than the one passed to the "--host" flag might result in
          websocket connection issues. You might need to use "--disableHostCheck" if that's the
          case.
        `);
      }
    }
    if (options.disableHostCheck) {
      this.context.logger.warn(tags.oneLine`
        WARNING: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
    }

    const servePath = this._buildServePath(options, browserOptions);
    const { styles, scripts } = browserOptions.optimization;

    const config: WebpackDevServer.Configuration = {
      host: options.host,
      port: options.port,
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: {
        index: `${servePath}/${path.basename(browserOptions.index)}`,
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      } as WebpackDevServer.HistoryApiFallbackConfig,
      stats: false,
      compress: styles || scripts,
      watchOptions: {
        poll: browserOptions.poll,
      },
      https: options.ssl,
      overlay: {
        errors: !(styles || scripts),
        warnings: false,
      },
      public: options.publicHost,
      disableHostCheck: options.disableHostCheck,
      publicPath: servePath,
      hot: options.hmr,
      contentBase: false,
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
    options: DevServerBuilderSchema,
    browserOptions: NormalizedBrowserBuilderSchema,
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
    options: DevServerBuilderSchema,
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

  private _addProxyConfig(
    root: string,
    options: DevServerBuilderSchema,
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

  private _buildServePath(
    options: DevServerBuilderSchema,
    browserOptions: NormalizedBrowserBuilderSchema,
  ) {
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

  private _getBrowserOptions(options: DevServerBuilderSchema) {
    const architect = this.context.architect;
    const [project, target, configuration] = options.browserTarget.split(':');

    const overridesOptions: DevServerBuilderSchemaKeys[] = [
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

    // remove options that are undefined or not to be overrriden
    const overrides = (Object.keys(options) as DevServerBuilderSchemaKeys[])
      .filter(key => options[key] !== undefined && overridesOptions.includes(key))
      .reduce<Partial<BrowserBuilderSchema>>((previous, key) => (
        {
          ...previous,
          [key]: options[key],
        }
      ), {});

    const browserTargetSpec = { project, target, configuration, overrides };
    const builderConfig = architect.getBuilderConfiguration<BrowserBuilderSchema>(
      browserTargetSpec);

    return architect.getBuilderDescription(builderConfig).pipe(
      concatMap(browserDescription =>
        architect.validateBuilderOptions(builderConfig, browserDescription)),
    );
  }
}

export default DevServerBuilder;
