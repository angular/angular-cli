/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { json, logging, tags } from '@angular-devkit/core';
import * as browserSync from 'browser-sync';
import * as proxy from 'http-proxy-middleware';
import { join } from 'path';
import {
  EMPTY,
  Observable,
  combineLatest,
  from,
  of,
  zip,
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounce,
  debounceTime,
  delay,
  finalize,
  ignoreElements,
  map,
  mapTo,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import * as url from 'url';
import { Schema } from './schema';

import { getAvailablePort, spawnAsObservable, waitUntilServerIsListening } from './utils';

/** Log messages to ignore and not rely to the logger */
const IGNORED_STDOUT_MESSAGES = [
  'server listening on',
  'Angular is running in the development mode. Call enableProdMode() to enable the production mode.'
];


export type SSRDevServerBuilderOptions = Schema & json.JsonObject;
export type SSRDevServerBuilderOutput = BuilderOutput & {
  baseUrl?: string;
};

export function execute(
  options: SSRDevServerBuilderOptions,
  context: BuilderContext,
): Observable<SSRDevServerBuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);
  const getBaseUrl = (bs: browserSync.BrowserSyncInstance) => `${bs.getOption('scheme')}://${bs.getOption('host')}:${bs.getOption('port')}`;

  const browserTargetRun = context.scheduleTarget(browserTarget, {
    extractCss: true,
    serviceWorker: false,
    watch: true,
    progress: options.progress,
  });

  const serverTargetRun = context.scheduleTarget(serverTarget, {
    watch: true,
    progress: options.progress,
  });

  const bsInstance = browserSync.create();

  context.logger.error(tags.stripIndents`
  ****************************************************************************************
  This is a simple server for use in testing or debugging Angular applications locally.
  It hasn't been reviewed for security issues.

  DON'T USE IT FOR PRODUCTION!
  ****************************************************************************************
 `);

  return zip(
    browserTargetRun,
    serverTargetRun,
    getAvailablePort(),
  ).pipe(
    switchMap(([br, sr, nodeServerPort]) => {
      const server$ = sr.output.pipe(
        switchMap(s => {
          if (!s.success) {
            return of(s);
          }

          return startNodeServer(s, nodeServerPort, context.logger).pipe(
            mapTo(s),
            catchError(err => {
              context.logger.error(`A server error has occurred.\n${mapErrorToMessage(err)}`);

              return EMPTY;
            }),
          );
        }));

      return combineLatest([br.output, server$]).pipe(
        // This is needed so that if both server and browser emit close to each other
        // we only emit once. This typically happens on the first build.
        debounceTime(120),
        map(([b, s]) => ([
          {
            success: b.success && s.success,
            error: b.error || s.error,
          },
          nodeServerPort,
        ] as [SSRDevServerBuilderOutput, number])),
        tap(([builderOutput]) => {
          if (builderOutput.success) {
            context.logger.info('\nCompiled successfully.');
          }
        }),
        debounce(([builderOutput]) => builderOutput.success
          ? waitUntilServerIsListening(nodeServerPort)
          : EMPTY)
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
        return from(initBrowserSync(bsInstance, nodeServerPort, options))
          .pipe(
            tap(bs => {
              const baseUrl = getBaseUrl(bs);
              context.logger.info(tags.oneLine`
                **
                Angular Universal Live Development Server is listening on ${baseUrl},
                open your browser on ${baseUrl}
                **
              `);
            }),
            mapTo(builderOutput),
          );
      }
    }),
    map(builderOutput => ({
      success: builderOutput.success,
      error: builderOutput.error,
      baseUrl: bsInstance && getBaseUrl(bsInstance),
    } as SSRDevServerBuilderOutput)),
    finalize(() => {
      if (bsInstance) {
        bsInstance.exit();
        bsInstance.cleanup();
      }
    }),
    catchError(error => of({
      success: false,
      error: mapErrorToMessage(error),
    })),
  );
}

function startNodeServer(
  serverOutput: BuilderOutput,
  port: number,
  logger: logging.LoggerApi,
): Observable<void> {
  const outputPath = serverOutput.outputPath as string;
  const path = join(outputPath, 'main.js');
  const env = { ...process.env, PORT: '' + port };

  return of(null)
    .pipe(
      delay(0), // Avoid EADDRINUSE error since it will cause the kill event to be finish.
      switchMap(() => spawnAsObservable('node', [`"${path}"`], { env, shell: true })),
      tap(({ stderr, stdout }) => {
        if (stderr) {
          logger.error(stderr);
        }

        if (stdout && !IGNORED_STDOUT_MESSAGES.some(x => stdout.includes(x))) {
          logger.info(stdout);
        }
      }),
      ignoreElements(),
      // Emit a signal after the process has been started
      startWith(undefined),
    );
}

async function initBrowserSync(
  browserSyncInstance: browserSync.BrowserSyncInstance,
  nodeServerPort: number,
  options: SSRDevServerBuilderOptions,
): Promise<browserSync.BrowserSyncInstance> {
  if (browserSyncInstance.active) {
    return browserSyncInstance;
  }

  const { port: browserSyncPort, open, host, publicHost } = options;
  const bsPort = browserSyncPort || await getAvailablePort();
  const bsOptions: browserSync.Options = {
    proxy: {
      target: `localhost:${nodeServerPort}`,
      proxyOptions: {
        xfwd: true
      },
      proxyRes: [
        proxyRes => {
          if ('headers' in proxyRes) {
            proxyRes.headers['cache-control'] = undefined;
          }
        },
      ]
      // proxyOptions is not in the typings
    } as browserSync.ProxyOptions & { proxyOptions: { xfwd: boolean } },
    host,
    port: bsPort,
    ui: false,
    server: false,
    notify: false,
    ghostMode: false,
    logLevel: 'silent',
    open,
    // Remove leading slash
    scriptPath: path => path.substring(1),
  };

  const publicHostNormalized = publicHost && publicHost.endsWith('/')
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
      bsOptions.middleware = [
        proxy(defaultSocketIoPath, {
          target: url.format({
            protocol: 'http',
            hostname: host,
            port: bsPort,
            pathname: path,
          }),
          ws: true,
          logLevel: 'silent',
        }),
      ];
    }
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

export default createBuilder<SSRDevServerBuilderOptions, BuilderOutput>(execute);
