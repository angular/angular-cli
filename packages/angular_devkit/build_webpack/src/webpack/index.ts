/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { getSystemPath, json, normalize, resolve } from '@angular-devkit/core';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import { EmittedFiles, getEmittedFiles } from '../utils';
import { Schema as RealWebpackBuilderSchema } from './schema';

export type WebpackBuilderSchema = json.JsonObject & RealWebpackBuilderSchema;

export interface WebpackLoggingCallback {
  (stats: webpack.Stats, config: webpack.Configuration): void;
}
export interface WebpackFactory {
  (config: webpack.Configuration, handler: webpack.Compiler.Handler): webpack.Compiler.Watching | webpack.Compiler;
  (config?: webpack.Configuration): webpack.Compiler;
}

export type BuildResult = BuilderOutput & {
  emittedFiles?: EmittedFiles[];
  webpackStats?: webpack.Stats.ToJsonOutput;
};

export function runWebpack(
  config: webpack.Configuration,
  context: BuilderContext,
  options: {
    logging?: WebpackLoggingCallback,
    webpackFactory?: WebpackFactory,
  } = {},
): Observable<BuildResult> {
  const log: WebpackLoggingCallback = options.logging
    || ((stats, config) => context.logger.info(stats.toString(config.stats)));

  // return createWebpack(config).pipe(
  return of(config).pipe(
    switchMap((config: webpack.Configuration) => new Observable<BuildResult>(obs => {
      try {
        const callback = (err?: Error, stats?: webpack.Stats) => {
          if (err) {
            return obs.error(err);
          }

          if (!stats) {
            return;
          }

          // Log stats.
          log(stats, config);

          obs.next({
            success: !stats.hasErrors(),
            webpackStats: stats.toJson(),
            emittedFiles: getEmittedFiles(stats.compilation),
          } as unknown as BuildResult);

          if (!config.watch) {
            obs.complete();
          }
        };
        if (config.watch) {
          const webpackWatcher = options.webpackFactory
            ? options.webpackFactory(config, callback)
            : webpack(config, callback);

          // Teardown logic. Close the watcher when unsubscribed from.
          return () => (webpackWatcher as webpack.Compiler.Watching).close(() => {});
        } else {
          const webpackCompiler = options.webpackFactory
            ? options.webpackFactory(config)
            : webpack(config);
          webpackCompiler.run(callback);
        }
      } catch (err) {
        if (err) {
          context.logger.error(`\nAn error occurred during the build:\n${err && err.stack || err}`);
        }
        throw err;
      }
    }),
  ));
}


export default createBuilder<WebpackBuilderSchema>((options, context) => {
  const configPath = resolve(normalize(context.workspaceRoot), normalize(options.webpackConfig));

  return from(import(getSystemPath(configPath))).pipe(
    switchMap((config: webpack.Configuration) => runWebpack(config, context)),
  );
});
