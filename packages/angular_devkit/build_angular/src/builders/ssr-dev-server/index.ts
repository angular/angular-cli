/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { loadProxyConfiguration } from '@angular/build/private';
import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { json, logging, tags } from '@angular-devkit/core';
import type {
  BrowserSyncInstance,
  Options as BrowserSyncOptions,
  HttpsOptions,
  MiddlewareHandler,
  ProxyOptions,
} from 'browser-sync';
import { join, resolve as pathResolve } from 'path';
import {
  EMPTY,
  Observable,
  catchError,
  combineLatest,
  concatMap,
  debounce,
  debounceTime,
  delay,
  finalize,
  from,
  ignoreElements,
  map,
  of,
  startWith,
  switchMap,
  tap,
  zip,
} from 'rxjs';
import * as url from 'url';
import { Schema } from './schema';

import { getAvailablePort, spawnAsObservable, waitUntilServerIsListening } from './utils';

/** Log messages to ignore and not rely to the logger */
const IGNORED_STDOUT_MESSAGES = [
  'server listening on',
  'Angular is running in development mode. Call enableProdMode() to enable production mode.',
];

export type SSRDevServerBuilderOptions = Schema;
export type SSRDevServerBuilderOutput = BuilderOutput & {
  baseUrl?: string;
  port?: string;
};

export function execute(
  options: SSRDevServerBuilderOptions,
  context: BuilderContext,
): Observable<SSRDevServerBuilderOutput> {
  let browserSync: typeof import('browser-sync');
  try {
    browserSync = require('browser-sync');
  } catch {
    return of({
      success: false,
      error:
        // eslint-disable-next-line max-len
        'Required dependency `browser-sync` is not installed, most likely you need to run `npm install browser-sync --save-dev` in your project.',
    });
  }

  const bsInstance = browserSync.create();

  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);
  const getBaseUrl = (bs: BrowserSyncInstance) =>
    `${bs.getOption('scheme')}://${bs.getOption('host')}:${bs.getOption('port')}`;
  const browserTargetRun = context.scheduleTarget(browserTarget, {
    watch: options.watch,
    progress: options.progress,
    verbose: options.verbose,
    // Disable bundle budgets are these are not meant to be used with a dev-server as this will add extra JavaScript for live-reloading.
    budgets: [],
  } as json.JsonObject);

  const serverTargetRun = context.scheduleTarget(serverTarget, {
    watch: options.watch,
    progress: options.progress,
    verbose: options.verbose,
  } as json.JsonObject);

  context.logger.error(tags.stripIndents`
  ****************************************************************************************
  This is a simple server for use in testing or debugging Angular applications locally.
  It hasn't been reviewed for security issues.

  DON'T USE IT FOR PRODUCTION!
  ****************************************************************************************
 `);

  return zip(browserTargetRun, serverTargetRun, getAvailablePort()).pipe(
    switchMap(([br, sr, nodeServerPort]) => {
      return combineLatest([br.output, sr.output]).pipe(
        // This is needed so that if both server and browser emit close to each other
        // we only emit once. This typically happens on the first build.
        debounceTime(120),
        switchMap(([b, s]) => {
          if (!s.success || !b.success) {
            return of([b, s]);
          }

          return startNodeServer(s, nodeServerPort, context.logger, !!options.inspect).pipe(
            map(() => [b, s]),
            catchError((err) => {
              context.logger.error(`A server error has occurred.\n${mapErrorToMessage(err)}`);

              return EMPTY;
            }),
          );
        }),
        map(
          ([b, s]) =>
            [
              {
                success: b.success && s.success,
                error: b.error || s.error,
              },
              nodeServerPort,
            ] as [SSRDevServerBuilderOutput, number],
        ),
        tap(([builderOutput]) => {
          if (builderOutput.success) {
            context.logger.info('\nCompiled successfully.');
          }
        }),
        debounce(([builderOutput]) =>
          builderOutput.success && !options.inspect
            ? waitUntilServerIsListening(nodeServerPort)
            : EMPTY,
        ),
        finalize(() => {
          void br.stop();
          void sr.stop();
        }),
      );
    }),
    concatMap(([builderOutput, nodeServerPort]) => {
      if (!builderOutput.success) {
        return of(builderOutput);
      }

      if (bsInstance.active) {
        bsInstance.reload();

        return of(builderOutput);
      } else {
        return from(initBrowserSync(bsInstance, nodeServerPort, options, context)).pipe(
          tap((bs) => {
            const baseUrl = getBaseUrl(bs);
            context.logger.info(tags.oneLine`
                **
                Angular Universal Live Development Server is listening on ${baseUrl},
                open your browser on ${baseUrl}
                **
              `);
          }),
          map(() => builderOutput),
        );
      }
    }),
    map(
      (builderOutput) =>
        ({
          success: builderOutput.success,
          error: builderOutput.error,
          baseUrl: getBaseUrl(bsInstance),
          port: bsInstance.getOption('port'),
        }) as SSRDevServerBuilderOutput,
    ),
    finalize(() => {
      if (bsInstance) {
        bsInstance.exit();
        bsInstance.cleanup();
      }
    }),
    catchError((error) =>
      of({
        success: false,
        error: mapErrorToMessage(error),
      }),
    ),
  );
}

// Logs output to the terminal.
// Removes any trailing new lines from the output.
export function log(
  { stderr, stdout }: { stderr: string | undefined; stdout: string | undefined },
  logger: logging.LoggerApi,
) {
  if (stderr) {
    // Strip the webpack scheme (webpack://) from error log.
    logger.error(stderr.replace(/\n?$/, '').replace(/webpack:\/\//g, '.'));
  }

  if (stdout && !IGNORED_STDOUT_MESSAGES.some((x) => stdout.includes(x))) {
    logger.info(stdout.replace(/\n?$/, ''));
  }
}

function startNodeServer(
  serverOutput: BuilderOutput,
  port: number,
  logger: logging.LoggerApi,
  inspectMode = false,
): Observable<void> {
  const outputPath = serverOutput.outputPath as string;
  const path = join(outputPath, 'main.js');
  const env = { ...process.env, PORT: '' + port };

  const args = ['--enable-source-maps', `"${path}"`];
  if (inspectMode) {
    args.unshift('--inspect-brk');
  }

  return of(null).pipe(
    delay(0), // Avoid EADDRINUSE error since it will cause the kill event to be finish.
    switchMap(() => spawnAsObservable('node', args, { env, shell: true })),
    tap((res) => log({ stderr: res.stderr, stdout: res.stdout }, logger)),
    ignoreElements(),
    // Emit a signal after the process has been started
    startWith(undefined),
  );
}

async function initBrowserSync(
  browserSyncInstance: BrowserSyncInstance,
  nodeServerPort: number,
  options: SSRDevServerBuilderOptions,
  context: BuilderContext,
): Promise<BrowserSyncInstance> {
  if (browserSyncInstance.active) {
    return browserSyncInstance;
  }

  const { port: browserSyncPort, open, host, publicHost, proxyConfig } = options;
  const bsPort = browserSyncPort || (await getAvailablePort());
  const bsOptions: BrowserSyncOptions = {
    proxy: {
      target: `localhost:${nodeServerPort}`,
      proxyOptions: {
        xfwd: true,
      },
      proxyRes: [
        (proxyRes) => {
          if ('headers' in proxyRes) {
            proxyRes.headers['cache-control'] = undefined;
          }
        },
      ],
      // proxyOptions is not in the typings
    } as ProxyOptions & { proxyOptions: { xfwd: boolean } },
    host,
    port: bsPort,
    ui: false,
    server: false,
    notify: false,
    ghostMode: false,
    logLevel: options.verbose ? 'debug' : 'silent',
    open,
    https: getSslConfig(context.workspaceRoot, options),
  };

  const publicHostNormalized =
    publicHost && publicHost.endsWith('/')
      ? publicHost.substring(0, publicHost.length - 1)
      : publicHost;

  if (publicHostNormalized) {
    const { protocol, hostname, port, pathname } = url.parse(publicHostNormalized);
    const defaultSocketIoPath = '/browser-sync/socket.io';
    const defaultNamespace = '/browser-sync';
    const hasPathname = !!(pathname && pathname !== '/');
    const namespace = hasPathname ? pathname + defaultNamespace : defaultNamespace;
    const path = hasPathname ? pathname + defaultSocketIoPath : defaultSocketIoPath;

    bsOptions.socket = {
      namespace,
      path,
      domain: url.format({
        protocol,
        hostname,
        port,
      }),
    };

    // When having a pathname we also need to create a reverse proxy because socket.io
    // will be listening on: 'http://localhost:4200/ssr/browser-sync/socket.io'
    // However users will typically have a reverse proxy that will redirect all matching requests
    // ex: http://testinghost.com/ssr -> http://localhost:4200 which will result in a 404.
    if (hasPathname) {
      const { createProxyMiddleware } = await import('http-proxy-middleware');

      // Remove leading slash
      bsOptions.scriptPath = (p) => p.substring(1);

      bsOptions.middleware = [
        createProxyMiddleware({
          pathFilter: defaultSocketIoPath,
          target: url.format({
            protocol: 'http',
            hostname: host,
            port: bsPort,
            pathname: path,
          }),
          ws: true,
          logger: {
            info: () => {},
            warn: () => {},
            error: () => {},
          },
        }),
      ];
    }
  }

  if (proxyConfig) {
    if (!bsOptions.middleware) {
      bsOptions.middleware = [];
    } else if (!Array.isArray(bsOptions.middleware)) {
      bsOptions.middleware = [bsOptions.middleware];
    }

    bsOptions.middleware = [
      ...bsOptions.middleware,
      ...(await getProxyConfig(context.workspaceRoot, proxyConfig)),
    ];
  }

  return new Promise((resolve, reject) => {
    browserSyncInstance.init(bsOptions, (error, bs) => {
      if (error) {
        reject(error);
      } else {
        resolve(bs);
      }
    });
  });
}

function mapErrorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

function getSslConfig(
  root: string,
  options: SSRDevServerBuilderOptions,
): HttpsOptions | undefined | boolean {
  const { ssl, sslCert, sslKey } = options;
  if (ssl && sslCert && sslKey) {
    return {
      key: pathResolve(root, sslKey),
      cert: pathResolve(root, sslCert),
    };
  }

  return ssl;
}

async function getProxyConfig(root: string, proxyConfig: string): Promise<MiddlewareHandler[]> {
  const proxy = await loadProxyConfiguration(root, proxyConfig);
  if (!proxy) {
    return [];
  }

  const { createProxyMiddleware } = await import('http-proxy-middleware');

  return Object.entries(proxy).map(([key, context]) => {
    const filterRegExp = new RegExp(key);

    return createProxyMiddleware({
      pathFilter: (pathname) => filterRegExp.test(pathname),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(context as any),
    });
  });
}

export default createBuilder<SSRDevServerBuilderOptions, BuilderOutput>(execute);
