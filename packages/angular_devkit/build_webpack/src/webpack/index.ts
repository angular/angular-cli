/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { resolve as pathResolve } from 'path';
import { Observable, from, isObservable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import { EmittedFiles, getEmittedFiles } from '../utils';
import { Schema as RealWebpackBuilderSchema } from './schema';

export type WebpackBuilderSchema = RealWebpackBuilderSchema;

export interface WebpackLoggingCallback {
  (stats: webpack.Stats, config: webpack.Configuration): void;
}
export interface WebpackFactory {
  (config: webpack.Configuration): Observable<webpack.Compiler> | webpack.Compiler;
}

export type BuildResult = BuilderOutput & {
  emittedFiles?: EmittedFiles[];
  webpackStats?: webpack.StatsCompilation;
  outputPath: string;
};

export function runWebpack(
  config: webpack.Configuration,
  context: BuilderContext,
  options: {
    logging?: WebpackLoggingCallback,
    webpackFactory?: WebpackFactory,
    shouldProvideStats?: boolean,
  } = {},
): Observable<BuildResult> {
  const {
    logging: log = (stats, config) => context.logger.info(stats.toString(config.stats)),
    shouldProvideStats = true,
  } = options;
  const createWebpack = (c: webpack.Configuration) => {
    if (options.webpackFactory) {
      const result = options.webpackFactory(c);
      if (isObservable(result)) {
        return result;
      } else {
        return of(result);
      }
    } else {
      return of(webpack(c));
    }
  };

  return createWebpack({ ...config, watch: false }).pipe(
    switchMap(webpackCompiler => new Observable<BuildResult>(obs => {
      // Webpack 5 has a compiler level close function
      const compilerClose = (webpackCompiler as { close?(callback: () => void): void }).close?.bind(
        webpackCompiler,
      );

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
          webpackStats: shouldProvideStats ? stats.toJson() : undefined,
          emittedFiles: getEmittedFiles(stats.compilation),
          outputPath: stats.compilation.outputOptions.path,
        } as unknown as BuildResult);

        if (!config.watch) {
          if (compilerClose) {
            compilerClose(() => obs.complete());
          } else {
            obs.complete();
          }
        }
      };

      try {
        if (config.watch) {
          const watchOptions = config.watchOptions || {};
          const watching = webpackCompiler.watch(watchOptions, callback);

          // Teardown logic. Close the watcher when unsubscribed from.
          return () => {
            watching.close(() => { });
            compilerClose?.(() => { });
          };
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
  const configPath = pathResolve(context.workspaceRoot, options.webpackConfig);

  return from(import(configPath)).pipe(
    switchMap((config: webpack.Configuration) => runWebpack(config, context)),
  );
});
