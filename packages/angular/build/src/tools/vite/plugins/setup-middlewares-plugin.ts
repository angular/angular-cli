/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Connect, Plugin } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';
import {
  ComponentStyleRecord,
  angularHtmlFallbackMiddleware,
  createAngularAssetsMiddleware,
  createAngularComponentMiddleware,
  createAngularHeadersMiddleware,
  createAngularIndexHtmlMiddleware,
  createAngularSsrExternalMiddleware,
  createAngularSsrInternalMiddleware,
} from '../middlewares';
import { AngularMemoryOutputFiles, AngularOutputAssets } from '../utils';

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

interface AngularSetupMiddlewaresPluginOptions {
  outputFiles: AngularMemoryOutputFiles;
  assets: AngularOutputAssets;
  extensionMiddleware?: Connect.NextHandleFunction[];
  indexHtmlTransformer?: (content: string) => Promise<string>;
  componentStyles: Map<string, ComponentStyleRecord>;
  templateUpdates: Map<string, string>;
  ssrMode: ServerSsrMode;
}

async function createEncapsulateStyle(): Promise<
  (style: Uint8Array, componentId: string) => string
> {
  const { encapsulateStyle } =
    await loadEsmModule<typeof import('@angular/compiler')>('@angular/compiler');
  const decoder = new TextDecoder('utf-8');

  return (style, componentId) => {
    return encapsulateStyle(decoder.decode(style), componentId);
  };
}

export function createAngularSetupMiddlewaresPlugin(
  options: AngularSetupMiddlewaresPluginOptions,
): Plugin {
  return {
    name: 'vite:angular-setup-middlewares',
    enforce: 'pre',
    async configureServer(server) {
      const {
        indexHtmlTransformer,
        outputFiles,
        extensionMiddleware,
        assets,
        componentStyles,
        templateUpdates,
        ssrMode,
      } = options;

      // Headers, assets and resources get handled first
      server.middlewares.use(createAngularHeadersMiddleware(server));
      server.middlewares.use(createAngularComponentMiddleware(templateUpdates));
      server.middlewares.use(
        createAngularAssetsMiddleware(
          server,
          assets,
          outputFiles,
          componentStyles,
          await createEncapsulateStyle(),
        ),
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
