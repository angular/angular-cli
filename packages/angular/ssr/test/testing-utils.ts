/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/platform-server';
import { RouterOutlet, Routes, provideRouter } from '@angular/router';
import { setAngularAppManifest } from '../src/manifest';

/**
 * Configures the Angular application for testing by setting up the Angular app manifest,
 * configuring server-side rendering, and bootstrapping the application with the provided routes.
 * This function generates a basic HTML template with a base href and sets up the necessary
 * Angular components and providers for testing purposes.
 *
 * @param routes - An array of route definitions to be used by the Angular Router.
 * @param [baseHref=''] - An optional base href to be used in the HTML template.
 */
export function setAngularAppTestingManifest(routes: Routes, baseHref = ''): void {
  setAngularAppManifest({
    inlineCriticalCss: false,
    assets: {
      'index.server.html': async () =>
        `
 <html>
  <head>
    <base href="/${baseHref}" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>`,
    },
    bootstrap: () => () => {
      @Component({
        standalone: true,
        selector: 'app-root',
        template: '<router-outlet />',
        imports: [RouterOutlet],
      })
      class AppComponent {}

      return bootstrapApplication(AppComponent, {
        providers: [provideServerRendering(), provideRouter(routes)],
      });
    },
  });
}
