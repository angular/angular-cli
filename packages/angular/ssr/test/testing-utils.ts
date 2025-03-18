/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Component,
  EnvironmentProviders,
  Provider,
  Type,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterOutlet, Routes, provideRouter } from '@angular/router';
import { destroyAngularServerApp } from '../src/app';
import { ServerAsset, setAngularAppManifest } from '../src/manifest';
import { ServerRoute, provideServerRendering, withRoutes } from '../src/routes/route-config';

@Component({
  standalone: true,
  selector: 'app-root',
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class AppComponent {}

/**
 * Configures the Angular application for testing by setting up the Angular app manifest,
 * configuring server-side rendering, and bootstrapping the application with the provided routes.
 * This function generates a basic HTML template with a base href and sets up the necessary
 * Angular components and providers for testing purposes.
 *
 * @param routes - An array of route definitions to be used by the Angular Router.
 * @param serverRoutes - An array of server route definitions for server-side rendering.
 * @param baseHref - An optional base href to be used in the HTML template.
 * @param additionalServerAssets - A record of additional server assets to include,
 *                                  where the keys are asset paths and the values are asset details.
 * @param locale - An optional locale to configure for the application during testing.
 * @param rootComponent - The root Angular component to bootstrap the application.
 * @param extraProviders - An optional array of additional providers that should be available to the
 *                         root component and all its children.
 */
export function setAngularAppTestingManifest(
  routes: Routes,
  serverRoutes: ServerRoute[],
  baseHref = '/',
  additionalServerAssets: Record<string, ServerAsset> = {},
  locale?: string,
  rootComponent: Type<unknown> = AppComponent,
  extraProviders: Array<Provider | EnvironmentProviders> = [],
): void {
  destroyAngularServerApp();

  setAngularAppManifest({
    inlineCriticalCss: false,
    baseHref,
    locale,
    assets: {
      ...additionalServerAssets,
      'index.server.html': {
        size: 25,
        hash: 'f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde',
        text: async () => `<html>
          <head>
            <title>SSR page</title>
            <base href="${baseHref}" />
          </head>
          <body>
            <app-root></app-root>
          </body>
        </html>
      `,
      },
      'index.csr.html': {
        size: 25,
        hash: 'f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde',
        text: async () =>
          `<html>
          <head>
            <title>CSR page</title>
            <base href="${baseHref}" />
          </head>
          <body>
            <app-root></app-root>
          </body>
        </html>
      `,
      },
    },
    bootstrap: async () => () => {
      return bootstrapApplication(rootComponent, {
        providers: [
          provideExperimentalZonelessChangeDetection(),
          provideRouter(routes),
          provideServerRendering(withRoutes(serverRoutes)),
          ...extraProviders,
        ],
      });
    },
  });
}
