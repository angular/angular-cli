/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Connect, Plugin } from 'vite';
import {
  angularHtmlFallbackMiddleware,
  createAngularAssetsMiddleware,
  createAngularHeadersMiddleware,
  createAngularIndexHtmlMiddleware,
  createAngularSsrExternalMiddleware,
  createAngularSsrInternalMiddleware,
} from './middlewares';
import { AngularMemoryOutputFiles } from './utils';

export enum ServerSsrMode {
  /**
   * No SSR
   */
  NoSsr,

  /**
   * Internal server-side rendering (SSR) is handled through the built-in middleware.
   *
   * In this mode, the SSR process is managed internally by the dev-server's middleware.
   * The server automatically renders pages on the server without requiring external
   * middleware or additional configuration from the developer.
   */
  InternalSsrMiddleware,

  /**
   * External server-side rendering (SSR) is handled by a custom middleware defined in server.ts.
   *
   * This mode allows developers to define custom SSR behavior by providing a middleware in the
   * `server.ts` file. It gives more flexibility for handling SSR, such as integrating with other
   * frameworks or customizing the rendering pipeline.
   */
  ExternalSsrMiddleware,
}

export interface AngularSetupMiddlewaresPluginOptions {
  outputFiles: AngularMemoryOutputFiles;
  assets: Map<string, string>;
  extensionMiddleware?: Connect.NextHandleFunction[];
  indexHtmlTransformer?: (content: string) => Promise<string>;
  usedComponentStyles: Map<string, string[]>;
  ssrMode: ServerSsrMode;
}

export function createAngularSetupMiddlewaresPlugin(
  options: AngularSetupMiddlewaresPluginOptions,
): Plugin {
  return {
    name: 'vite:angular-setup-middlewares',
    enforce: 'pre',
    configureServer(server) {
      const {
        indexHtmlTransformer,
        outputFiles,
        extensionMiddleware,
        assets,
        usedComponentStyles,
        ssrMode,
      } = options;

      // Headers, assets and resources get handled first
      server.middlewares.use(createAngularHeadersMiddleware(server));
      server.middlewares.use(
        createAngularAssetsMiddleware(server, assets, outputFiles, usedComponentStyles),
      );

      extensionMiddleware?.forEach((middleware) => server.middlewares.use(middleware));

      // Returning a function, installs middleware after the main transform middleware but
      // before the built-in HTML middleware
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      return async () => {
        if (ssrMode === ServerSsrMode.ExternalSsrMiddleware) {
          server.middlewares.use(
            await createAngularSsrExternalMiddleware(server, indexHtmlTransformer),
          );

          return;
        }

        if (ssrMode === ServerSsrMode.InternalSsrMiddleware) {
          server.middlewares.use(createAngularSsrInternalMiddleware(server, indexHtmlTransformer));
        }

        server.middlewares.use(angularHtmlFallbackMiddleware);
        server.middlewares.use(
          createAngularIndexHtmlMiddleware(server, outputFiles, indexHtmlTransformer),
        );
      };
    },
  };
}
