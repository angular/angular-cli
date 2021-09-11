/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { createServer } from 'net';
import { resolve as pathResolve } from 'path';
import { Observable, from, isObservable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { getEmittedFiles } from '../utils';
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

  const log: WebpackLoggingCallback =
    options.logging || ((stats, config) => context.logger.info(stats.toString(config.stats)));

  return createWebpack({ ...config, watch: false }).pipe(
    switchMap(async (webpackCompiler) => {
      const devServerConfig = options.devServerConfig || config.devServer || {};
      devServerConfig.host ??= 'localhost';

      // Webpack-dev-server doesnt' handle concurrency very well.
      // When using port 0, and 2 processes start at the same time, they end up being given the same port.
      // The below is a workaround until the issue is resolved upstream.
      // The main reason for the issue is that it find a free port, put only uses at a later stage
      // and the `WEBPACK_DEV_SERVER_BASE_PORT` is always set the same.
      if (devServerConfig.port === 'auto' || devServerConfig.port === 0) {
        try {
          const port = await getFreePort();
          if (port) {
            // We set `WEBPACK_DEV_SERVER_BASE_PORT` instead of the `port` option to still use the retry mechanism
            // in case the port get assigned in the meantime.
            // https://github.com/webpack/webpack-dev-server/blob/2b1208dadfbe70246a36b74954e3f2fd2c3ba220/lib/Server.js#L76-L94
            process.env.WEBPACK_DEV_SERVER_BASE_PORT = `${port}`;
          }
        } catch {}
      }

      return [webpackCompiler, devServerConfig] as [
        webpack.Compiler,
        WebpackDevServer.Configuration,
      ];
    }),
    switchMap(
      ([webpackCompiler, devServerConfig]) =>
        new Observable<DevServerBuildOutput>((obs) => {
          let result: Partial<DevServerBuildOutput>;

          webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
            // Log stats.
            log(stats, config);
            obs.next({
              ...result,
              emittedFiles: getEmittedFiles(stats.compilation),
              success: !stats.hasErrors(),
              outputPath: stats.compilation.outputOptions.path,
            } as unknown as DevServerBuildOutput);
          });

          const devServer = createWebpackDevServer(webpackCompiler, devServerConfig);
          devServer.startCallback(() => {
            const address = devServer.server.address();
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

export default createBuilder<WebpackDevServerBuilderSchema, DevServerBuildOutput>(
  (options, context) => {
    const configPath = pathResolve(context.workspaceRoot, options.webpackConfig);

    return from(import(configPath)).pipe(
      switchMap(({ default: config }: { default: webpack.Configuration }) =>
        runWebpackDevServer(config, context),
      ),
    );
  },
);

function getFreePort(): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server
      .unref()
      .once('error', reject)
      .listen(0, () => {
        const address = server.address();
        resolve(address && typeof address !== 'string' ? address.port : undefined);
        server.close();
      });
  });
}
