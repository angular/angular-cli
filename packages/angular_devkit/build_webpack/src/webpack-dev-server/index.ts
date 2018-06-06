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
import { Path, getSystemPath, normalize, resolve } from '@angular-devkit/core';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { LoggingCallback, defaultLoggingCb } from '../webpack';
import { WebpackDevServerBuilderSchema } from './schema';


export class WebpackDevServerBuilder implements Builder<WebpackDevServerBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<WebpackDevServerBuilderSchema>): Observable<BuildEvent> {
    const configPath = resolve(this.context.workspace.root,
      normalize(builderConfig.options.webpackConfig));

    return this.loadWebpackConfig(getSystemPath(configPath)).pipe(
      concatMap(config => this.runWebpackDevServer(config)),
    );
  }

  public loadWebpackConfig(webpackConfigPath: string): Observable<webpack.Configuration> {
    return from(import(webpackConfigPath));
  }

  public runWebpackDevServer(
    webpackConfig: webpack.Configuration,
    devServerCfg?: WebpackDevServer.Configuration,
    loggingCb: LoggingCallback = defaultLoggingCb,
  ): Observable<BuildEvent> {
    return new Observable(obs => {
      const devServerConfig = devServerCfg || webpackConfig.devServer || {};
      devServerConfig.host = devServerConfig.host || 'localhost';
      devServerConfig.port = devServerConfig.port || 8080;

      if (devServerConfig.stats) {
        webpackConfig.stats = devServerConfig.stats;
      }
      // Disable stats reporting by the devserver, we have our own logger.
      devServerConfig.stats = false;

      const webpackCompiler = webpack(webpackConfig);
      const server = new WebpackDevServer(webpackCompiler, devServerConfig);

      webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
        // Log stats.
        loggingCb(stats, webpackConfig, this.context.logger);

        obs.next({ success: !stats.hasErrors() });
      });

      server.listen(
        devServerConfig.port,
        devServerConfig.host,
        (err) => {
          if (err) {
            obs.error(err);
          }
        },
      );

      // Teardown logic. Close the server when unsubscribed from.
      return () => server.close();
    });
  }
}


export default WebpackDevServerBuilder;
