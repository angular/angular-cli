/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, tags } from '@angular-devkit/core';
import { existsSync, readFileSync } from 'fs';
import { posix, resolve } from 'path';
import * as url from 'url';
import * as webpack from 'webpack';
import { Configuration } from 'webpack-dev-server';
import { normalizeOptimization } from '../../utils';
import { WebpackConfigOptions, WebpackDevServerOptions } from '../../utils/build-options';
import { getIndexOutputFile } from '../../utils/webpack-browser-config';
import { HmrLoader } from '../plugins/hmr/hmr-loader';
import { getWatchOptions } from '../utils/helpers';

export function getDevServerConfig(
  wco: WebpackConfigOptions<WebpackDevServerOptions>,
): webpack.Configuration {
  const {
    buildOptions: {
      optimization,
      host,
      port,
      index,
      headers,
      poll,
      ssl,
      hmr,
      main,
      disableHostCheck,
      liveReload,
      allowedHosts,
      watch,
      proxyConfig,
    },
    logger,
    root,
  } = wco;

  const servePath = buildServePath(wco.buildOptions, logger);
  const { styles: stylesOptimization, scripts: scriptsOptimization } = normalizeOptimization(optimization);

  const extraPlugins = [];

  // Resolve public host and client address.
  let publicHost = wco.buildOptions.publicHost;
  if (publicHost) {
    if (!/^\w+:\/\//.test(publicHost)) {
      publicHost = `${ssl ? 'https' : 'http'}://${publicHost}`;
    }

    const parsedHost = url.parse(publicHost);
    publicHost = parsedHost.host ?? undefined;
  } else {
    publicHost = '0.0.0.0:0';
  }

  if (!watch) {
    // There's no option to turn off file watching in webpack-dev-server, but
    // we can override the file watcher instead.
    extraPlugins.push({
      // tslint:disable-next-line:no-any
      apply: (compiler: any) => {
        compiler.hooks.afterEnvironment.tap('angular-cli', () => {
          compiler.watchFileSystem = { watch: () => { } };
        });
      },
    });
  }

  const extraRules: webpack.RuleSetRule[] = [];
  if (hmr) {
    extraRules.push({
      loader: HmrLoader,
      include: [main].map(p => resolve(wco.root, p)),
    });
  }

  return {
    plugins: extraPlugins,
    module: {
      rules: extraRules,
    },
    devServer: {
      host,
      port,
      headers: {
        'Access-Control-Allow-Origin': '*',
        ...headers,
      },
      historyApiFallback: !!index && {
        index: `${servePath}/${getIndexOutputFile(index)}`,
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        rewrites: [
          {
            from: new RegExp(`^(?!${servePath})/.*`),
            to: context => url.format(context.parsedUrl),
          },
        ],
      },
      sockPath: posix.join(servePath, 'sockjs-node'),
      stats: false,
      compress: stylesOptimization.minify || scriptsOptimization,
      watchOptions: getWatchOptions(poll),
      https: getSslConfig(root, wco.buildOptions),
      overlay: {
        errors: !(stylesOptimization.minify || scriptsOptimization),
        warnings: false,
      },
      public: publicHost,
      allowedHosts,
      disableHostCheck,
      // This should always be true, but at the moment this breaks 'SuppressExtractedTextChunksWebpackPlugin'
      // because it will include addition JS in the styles.js.
      inline: hmr,
      publicPath: servePath,
      liveReload,
      injectClient: liveReload,
      hotOnly: hmr && !liveReload,
      hot: hmr,
      proxy: addProxyConfig(root, proxyConfig),
      contentBase: false,
      logLevel: 'error',
    } as Configuration & { logLevel: Configuration['clientLogLevel'] },
  };
}


/**
 * Resolve and build a URL _path_ that will be the root of the server. This resolved base href and
 * deploy URL from the browser options and returns a path from the root.
 */
export function buildServePath(
  options: WebpackDevServerOptions,
  logger: logging.LoggerApi,
): string {
  let servePath = options.servePath;
  if (servePath === undefined) {
    const defaultPath = findDefaultServePath(options.baseHref, options.deployUrl);
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
 * Private method to enhance a webpack config with SSL configuration.
 * @private
 */
function getSslConfig(
  root: string,
  options: WebpackDevServerOptions,
) {
  const { ssl, sslCert, sslKey } = options;
  if (ssl && sslCert && sslKey) {
    return {
      key: readFileSync(resolve(root, sslKey), 'utf-8'),
      cert: readFileSync(resolve(root, sslCert), 'utf-8'),
    };
  }

  return ssl;
}

/**
 * Private method to enhance a webpack config with Proxy configuration.
 * @private
 */
function addProxyConfig(
  root: string,
  proxyConfig: string | undefined,
) {
  if (!proxyConfig) {
    return undefined;
  }

  const proxyPath = resolve(root, proxyConfig);
  if (existsSync(proxyPath)) {
    return require(proxyPath);
  }

  throw new Error('Proxy config file ' + proxyPath + ' does not exist.');
}

/**
 * Find the default server path. We don't want to expose baseHref and deployUrl as arguments, only
 * the browser options where needed. This method should stay private (people who want to resolve
 * baseHref and deployUrl should use the buildServePath exported function.
 * @private
 */
function findDefaultServePath(baseHref?: string, deployUrl?: string): string | null {
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
