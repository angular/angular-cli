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
import { ArchitectPlugin } from '../plugins/architect';
import { EmittedFiles, getEmittedFiles } from '../utils';
import { Schema as RealWebpackBuilderSchema } from './schema';

const webpackMerge = require('webpack-merge');

export type WebpackBuilderSchema = json.JsonObject & RealWebpackBuilderSchema;

export interface WebpackLoggingCallback {
  (stats: webpack.Stats, config: webpack.Configuration): void;
}
export interface WebpackFactory {
  (config: webpack.Configuration): Observable<webpack.Compiler>;
}

export type BuildResult = BuilderOutput & {
  emittedFiles?: EmittedFiles[];
};

export function runWebpack(
  config: webpack.Configuration,
  context: BuilderContext,
  options: {
    logging?: WebpackLoggingCallback,
    webpackFactory?: WebpackFactory,
  } = {},
): Observable<BuildResult> {
  const createWebpack = options.webpackFactory || (config => of(webpack(config)));
  const log: WebpackLoggingCallback = options.logging
    || ((stats, config) => context.logger.info(stats.toString(config.stats)));

  config = webpackMerge(config, {
    plugins: [
      new ArchitectPlugin(context),
    ],
  });

  return createWebpack(config).pipe(
    switchMap(webpackCompiler => new Observable<BuildResult>(obs => {
      const callback: webpack.Compiler.Handler = (err, stats) => {
        if (err) {
          return obs.error(err);
        }

        // Log stats.
        log(stats, config);

        obs.next({
          success: !stats.hasErrors(),
          emittedFiles: getEmittedFiles(stats.compilation),
        } as unknown as BuildResult);

        if (!config.watch) {
          obs.complete();
        }
      };

      try {
        if (config.watch) {
          const watchOptions = config.watchOptions || {};
          const watching = webpackCompiler.watch(watchOptions, callback);

          // Teardown logic. Close the watcher when unsubscribed from.
          return () => watching.close(() => { });
        } else {
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
