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
import { Path, getSystemPath, logging, normalize, resolve } from '@angular-devkit/core';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import { WebpackBuilderSchema } from './schema';


export interface LoggingCallback {
  (stats: webpack.Stats, config: webpack.Configuration, logger: logging.Logger): void;
}

export const defaultLoggingCb: LoggingCallback = (stats, config, logger) =>
  logger.info(stats.toString(config.stats));

export class WebpackBuilder implements Builder<WebpackBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<WebpackBuilderSchema>): Observable<BuildEvent> {
    const configPath = resolve(this.context.workspace.root,
      normalize(builderConfig.options.webpackConfig));

    return this.loadWebpackConfig(getSystemPath(configPath)).pipe(
      concatMap(config => this.runWebpack(config)),
    );
  }

  public loadWebpackConfig(webpackConfigPath: string): Observable<webpack.Configuration> {
    return from(import(webpackConfigPath));
  }

  public runWebpack(
    config: webpack.Configuration, loggingCb = defaultLoggingCb,
  ): Observable<BuildEvent> {
    return new Observable(obs => {
      const webpackCompiler = webpack(config);

      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return obs.error(err);
        }

        // Log stats.
        loggingCb(stats, config, this.context.logger);

        obs.next({ success: !stats.hasErrors() });

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
          this.context.logger.error(
            '\nAn error occured during the build:\n' + ((err && err.stack) || err));
        }
        throw err;
      }
    });
  }
}

export default WebpackBuilder;
