/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuilderOutput,
  createBuilder,
  BuilderContext,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { json, tags, logging } from '@angular-devkit/core';
import {
  Observable,
  from,
  of,
  NEVER,
  combineLatest,
  zip,
} from 'rxjs';
import { Schema } from './schema';
import {
  debounceTime,
  switchMap,
  map,
  tap,
  catchError,
  startWith,
  mapTo,
} from 'rxjs/operators';
import { getAvailablePort, execAsObservable } from './utils';
import * as browserSync from 'browser-sync';
import { join } from 'path';

export type SSRDevServerBuilderOptions = Schema & json.JsonObject;

export function execute(
  options: SSRDevServerBuilderOptions,
  context: BuilderContext,
): Observable<BuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);

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

  context.logger.error(tags.stripIndents`
  ****************************************************************************************
  This is a simple server for use in testing or debugging Angular applications locally.
  It hasn't been reviewed for security issues.

  DON'T USE IT FOR PRODUCTION!
  ****************************************************************************************
 `);

  let bsInstance: browserSync.BrowserSyncInstance | undefined;
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
          return startNodeServer(s, nodeServerPort).pipe(
            mapTo(s),
            catchError(err => {
              context.logger.error(`A server error has occurred.\n${mapErrorToMessage(err)}`);
              return NEVER;
            }),
          );
        }));

      return combineLatest(br.output, server$, of(nodeServerPort)).pipe(
        // This is needed so that if both server and browser emit close to each other
        // we only emit once. This typically happens on the first build.
        debounceTime(100),
      );
    }),
    map(([b, s, nodeServerPort]) => ([
      {
        success: b.success && s.success,
        error: b.error || s.error,
      },
      nodeServerPort,
    ] as [BuilderOutput, number])),
    switchMap(([builderOutput, nodeServerPort]) => {
      if (!builderOutput.success) {
        return of(builderOutput);
      }
      if (!bsInstance) {
        return from(startBrowserSync(nodeServerPort, options, context.logger)).pipe(
          tap(instance => bsInstance = instance),
          mapTo(builderOutput)
        );
      } else {
        bsInstance.reload();
        return of(builderOutput);
      }
    }),
    catchError(error => of({
      success: false,
      error: mapErrorToMessage(error),
    }))
  );
}

function startNodeServer(serverOutput: BuilderOutput, port: number): Observable<void> {
  const outputPath = serverOutput.outputPath as string;
  const path = join(outputPath, 'main.js');
  const env = { ...process.env, PORT: '' + port };

  return execAsObservable(`node ${path}`, { env })
    .pipe(
      // Emit a signal after the process has been started
      startWith(undefined),
      mapTo(undefined),
    );
}

async function startBrowserSync(
  nodeServerPort: number,
  options: SSRDevServerBuilderOptions,
  logger: logging.LoggerApi,
): Promise<browserSync.BrowserSyncInstance> {
  const { port, open } = options;
  const bsPort = port || await getAvailablePort();

  const instance = browserSync.init({
    proxy: `localhost:${nodeServerPort}`,
    port: bsPort,
    ui: false,
    server: false,
    notify: false,
    ghostMode: false,
    logLevel: 'silent',
    open,
  });

  logger.info(tags.oneLine`
    **
    Angular Universal Live Development Server is listening on http://localhost:${bsPort},
    open your browser on http://localhost:${bsPort}
    **
  `);

  return instance;
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
