/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { StaticProvider, ɵConsole, ɵresetCompiledComponents } from '@angular/core';
import { ɵSERVER_CONTEXT as SERVER_CONTEXT } from '@angular/platform-server';
import type { AngularServerApp } from './app';
import { Console } from './console';
import { REQUEST, REQUEST_CONTEXT, RESPONSE_INIT } from './tokens';
import { renderAngular } from './utils';

/**
 * Enum representing the different contexts in which server rendering can occur.
 */
export enum ServerRenderContext {
  SSR = 'ssr',
  SSG = 'ssg',
  AppShell = 'app-shell',
}

/**
 * Renders an Angular server application to produce a response for the given HTTP request.
 * Supports server-side rendering (SSR), static site generation (SSG), or app shell rendering.
 *
 * @param app - The server application instance to render.
 * @param request - The incoming HTTP request object.
 * @param serverContext - Context specifying the rendering mode.
 * @param requestContext - Optional additional context for the request, such as metadata.
 * @returns A promise that resolves to a response object representing the rendered content.
 */
export async function render(
  app: AngularServerApp,
  request: Request,
  serverContext: ServerRenderContext,
  requestContext?: unknown,
): Promise<Response> {
  const isSsrMode = serverContext === ServerRenderContext.SSR;
  const responseInit: ResponseInit = {};
  const platformProviders: StaticProvider = [
    {
      provide: SERVER_CONTEXT,
      useValue: serverContext,
    },
  ];

  if (isSsrMode) {
    platformProviders.push(
      {
        provide: REQUEST,
        useValue: request,
      },
      {
        provide: REQUEST_CONTEXT,
        useValue: requestContext,
      },
      {
        provide: RESPONSE_INIT,
        useValue: responseInit,
      },
    );
  }

  const { manifest, hooks, isDevMode } = app;

  if (isDevMode) {
    // Need to clean up GENERATED_COMP_IDS map in `@angular/core`.
    // Otherwise an incorrect component ID generation collision detected warning will be displayed in development.
    // See: https://github.com/angular/angular-cli/issues/25924
    ɵresetCompiledComponents();

    // An Angular Console Provider that does not print a set of predefined logs.
    platformProviders.push({
      provide: ɵConsole,
      // Using `useClass` would necessitate decorating `Console` with `@Injectable`,
      // which would require switching from `ts_library` to `ng_module`. This change
      // would also necessitate various patches of `@angular/bazel` to support ESM.
      useFactory: () => new Console(),
    });
  }

  let html = await app.getServerAsset('index.server.html');
  // Skip extra microtask if there are no pre hooks.
  if (hooks.has('html:transform:pre')) {
    html = await hooks.run('html:transform:pre', { html });
  }

  let url = request.url;

  // A request to `http://www.example.com/page/index.html` will render the Angular route corresponding to `http://www.example.com/page`.
  if (url.includes('/index.html')) {
    const urlToModify = new URL(url);
    urlToModify.pathname = urlToModify.pathname.replace(/index\.html$/, '');
    url = urlToModify.toString();
  }

  return new Response(
    await renderAngular(html, manifest.bootstrap(), url, platformProviders),
    responseInit,
  );
}
