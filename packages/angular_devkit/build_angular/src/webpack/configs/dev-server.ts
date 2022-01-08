/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, tags } from '@angular-devkit/core';
import { existsSync, promises as fsPromises } from 'fs';
import { extname, posix, resolve } from 'path';
import { URL, pathToFileURL } from 'url';
import { Configuration, RuleSetRule } from 'webpack';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { WebpackConfigOptions, WebpackDevServerOptions } from '../../utils/build-options';
import { loadEsmModule } from '../../utils/load-esm';
import { getIndexOutputFile } from '../../utils/webpack-browser-config';
import { HmrLoader } from '../plugins/hmr/hmr-loader';

export async function getDevServerConfig(
  wco: WebpackConfigOptions<WebpackDevServerOptions>,
): Promise<Configuration> {
  const {
    buildOptions: { host, port, index, headers, watch, hmr, main, liveReload, proxyConfig },
    logger,
    root,
  } = wco;

  const servePath = buildServePath(wco.buildOptions, logger);

  const extraRules: RuleSetRule[] = [];
  if (hmr) {
    extraRules.push({
      loader: HmrLoader,
      include: [main].map((p) => resolve(wco.root, p)),
    });
  }

  const extraPlugins = [];
  if (!watch) {
    // There's no option to turn off file watching in webpack-dev-server, but
    // we can override the file watcher instead.
    extraPlugins.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apply: (compiler: any) => {
        compiler.hooks.afterEnvironment.tap('angular-cli', () => {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          compiler.watchFileSystem = { watch: () => {} };
        });
      },
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
        index: posix.join(servePath, getIndexOutputFile(index)),
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        rewrites: [
          {
            from: new RegExp(`^(?!${servePath})/.*`),
            to: (context) => context.parsedUrl.href,
          },
        ],
      },
      compress: false,
      static: false,
      server: getServerConfig(root, wco.buildOptions),
      allowedHosts: getAllowedHostsConfig(wco.buildOptions),
      devMiddleware: {
        publicPath: servePath,
        stats: false,
      },
      liveReload,
      hot: hmr && !liveReload ? 'only' : hmr,
      proxy: await addProxyConfig(root, proxyConfig),
      ...getWebSocketSettings(wco.buildOptions, servePath),
    },
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
function getServerConfig(
  root: string,
  options: WebpackDevServerOptions,
): DevServerConfiguration['server'] {
  const { ssl, sslCert, sslKey } = options;
  if (!ssl) {
    return 'http';
  }

  return {
    type: 'https',
    options:
      sslCert && sslKey
        ? {
            key: resolve(root, sslKey),
            cert: resolve(root, sslCert),
          }
        : undefined,
  };
}

/**
 * Private method to enhance a webpack config with Proxy configuration.
 * @private
 */
async function addProxyConfig(root: string, proxyConfig: string | undefined) {
  if (!proxyConfig) {
    return undefined;
  }

  const proxyPath = resolve(root, proxyConfig);

  if (!existsSync(proxyPath)) {
    throw new Error(`Proxy configuration file ${proxyPath} does not exist.`);
  }

  switch (extname(proxyPath)) {
    case '.json': {
      const content = await fsPromises.readFile(proxyPath, 'utf-8');

      const { parse, printParseErrorCode } = await import('jsonc-parser');
      const parseErrors: import('jsonc-parser').ParseError[] = [];
      const proxyConfiguration = parse(content, parseErrors, { allowTrailingComma: true });

      if (parseErrors.length > 0) {
        let errorMessage = `Proxy configuration file ${proxyPath} contains parse errors:`;
        for (const parseError of parseErrors) {
          const { line, column } = getJsonErrorLineColumn(parseError.offset, content);
          errorMessage += `\n[${line}, ${column}] ${printParseErrorCode(parseError.error)}`;
        }
        throw new Error(errorMessage);
      }

      return proxyConfiguration;
    }
    case '.mjs':
      // Load the ESM configuration file using the TypeScript dynamic import workaround.
      // Once TypeScript provides support for keeping the dynamic import this workaround can be
      // changed to a direct dynamic import.
      return (await loadEsmModule<{ default: unknown }>(pathToFileURL(proxyPath))).default;
    case '.cjs':
      return require(proxyPath);
    default:
      // The file could be either CommonJS or ESM.
      // CommonJS is tried first then ESM if loading fails.
      try {
        return require(proxyPath);
      } catch (e) {
        if (e.code === 'ERR_REQUIRE_ESM') {
          // Load the ESM configuration file using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          return (await loadEsmModule<{ default: unknown }>(pathToFileURL(proxyPath))).default;
        }

        throw e;
      }
  }
}

/**
 * Calculates the line and column for an error offset in the content of a JSON file.
 * @param location The offset error location from the beginning of the content.
 * @param content The full content of the file containing the error.
 * @returns An object containing the line and column
 */
function getJsonErrorLineColumn(offset: number, content: string) {
  if (offset === 0) {
    return { line: 1, column: 1 };
  }

  let line = 0;
  let position = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    ++line;

    const nextNewline = content.indexOf('\n', position);
    if (nextNewline === -1 || nextNewline > offset) {
      break;
    }

    position = nextNewline + 1;
  }

  return { line, column: offset - position + 1 };
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
  const baseHrefParts = (baseHref || '').split('/').filter((part) => part !== '');
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

function getAllowedHostsConfig(
  options: WebpackDevServerOptions,
): DevServerConfiguration['allowedHosts'] {
  if (options.disableHostCheck) {
    return 'all';
  } else if (options.allowedHosts?.length) {
    return options.allowedHosts;
  }

  return undefined;
}

function getWebSocketSettings(
  options: WebpackDevServerOptions,
  servePath: string,
): {
  webSocketServer?: DevServerConfiguration['webSocketServer'];
  client?: DevServerConfiguration['client'];
} {
  const { hmr, liveReload } = options;
  if (!hmr && !liveReload) {
    return {
      webSocketServer: false,
      client: undefined,
    };
  }

  const webSocketPath = posix.join(servePath, 'ws');

  return {
    webSocketServer: {
      options: {
        path: webSocketPath,
      },
    },
    client: {
      logging: 'info',
      webSocketURL: getPublicHostOptions(options, webSocketPath),
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  };
}

function getPublicHostOptions(options: WebpackDevServerOptions, webSocketPath: string): string {
  let publicHost: string | null | undefined = options.publicHost;
  if (publicHost) {
    const hostWithProtocol = !/^\w+:\/\//.test(publicHost) ? `https://${publicHost}` : publicHost;
    publicHost = new URL(hostWithProtocol).host;
  }

  return `auto://${publicHost || '0.0.0.0:0'}${webSocketPath}`;
}
