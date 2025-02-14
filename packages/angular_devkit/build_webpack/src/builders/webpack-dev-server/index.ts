/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Builder, BuilderContext, createBuilder } from '@angular-devkit/architect';
import { resolve as pathResolve } from 'node:path';
import { Observable, from, isObservable, of, switchMap } from 'rxjs';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { getEmittedFiles, getWebpackConfig } from '../../utils';
import { BuildResult, WebpackFactory, WebpackLoggingCallback } from '../webpack';
import { Schema as WebpackDevServerBuilderSchema } from './schema';

export type WebpackDevServerFactory = typeof WebpackDevServer;

export type DevServerBuildOutput = BuildResult & {
  port: number;
  family: string;
  address: string;
};

export function runWebpackDevServer(
  config: webpack.Configuration,
  context: BuilderContext,
  options: {
    shouldProvideStats?: boolean;
    devServerConfig?: WebpackDevServer.Configuration;
    logging?: WebpackLoggingCallback;
    webpackFactory?: WebpackFactory;
    webpackDevServerFactory?: WebpackDevServerFactory;
  } = {},
): Observable<DevServerBuildOutput> {
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

  const createWebpackDevServer = (
    webpack: webpack.Compiler | webpack.MultiCompiler,
    config: WebpackDevServer.Configuration,
  ) => {
    if (options.webpackDevServerFactory) {
      return new options.webpackDevServerFactory(config, webpack);
    }

    return new WebpackDevServer(config, webpack);
  };

  const {
    logging: log = (stats, config) => {
      if (config.stats !== false) {
        const statsOptions = config.stats === true ? undefined : config.stats;
        context.logger.info(stats.toString(statsOptions));
      }
    },
    shouldProvideStats = true,
  } = options;

  return createWebpack({ ...config, watch: false }).pipe(
    switchMap(
      (webpackCompiler) =>
        new Observable<DevServerBuildOutput>((obs) => {
          const devServerConfig = options.devServerConfig || config.devServer || {};
          devServerConfig.host ??= 'localhost';

          let result: Partial<DevServerBuildOutput>;

          const statsOptions = typeof config.stats === 'boolean' ? undefined : config.stats;

          webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
            // Log stats.
            log(stats, config);
            obs.next({
              ...result,
              webpackStats: shouldProvideStats ? stats.toJson(statsOptions) : undefined,
              emittedFiles: getEmittedFiles(stats.compilation),
              success: !stats.hasErrors(),
              outputPath: stats.compilation.outputOptions.path,
            } as unknown as DevServerBuildOutput);
          });

          const devServer = createWebpackDevServer(webpackCompiler, devServerConfig);
          devServer.startCallback((err) => {
            if (err) {
              obs.error(err);

              return;
            }

            const address = devServer.server?.address();
            if (!address) {
              obs.error(new Error(`Dev-server address info is not defined.`));

              return;
            }

            result = {
              success: true,
              port: typeof address === 'string' ? 0 : address.port,
              family: typeof address === 'string' ? '' : address.family,
              address: typeof address === 'string' ? address : address.address,
            };
          });

          // Teardown logic. Close the server when unsubscribed from.
          return () => {
            devServer.stopCallback(() => {});
            webpackCompiler.close(() => {});
          };
        }),
    ),
  );
}

const builder: Builder<WebpackDevServerBuilderSchema> = createBuilder<
  WebpackDevServerBuilderSchema,
  DevServerBuildOutput
>((options, context) => {
  const configPath = pathResolve(context.workspaceRoot, options.webpackConfig);

  return from(getWebpackConfig(configPath)).pipe(
    switchMap((config) => runWebpackDevServer(config, context)),
  );
});

export default builder;
