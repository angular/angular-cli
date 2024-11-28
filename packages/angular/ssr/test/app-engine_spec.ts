/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// The compiler is needed as tests are in JIT.
/* eslint-disable import/no-unassigned-import */
import '@angular/compiler';
/* eslint-enable import/no-unassigned-import */

import { Component } from '@angular/core';
import { destroyAngularServerApp, getOrCreateAngularServerApp } from '../src/app';
import { AngularAppEngine } from '../src/app-engine';
import { setAngularAppEngineManifest } from '../src/manifest';
import { RenderMode } from '../src/routes/route-config';
import { setAngularAppTestingManifest } from './testing-utils';

describe('AngularAppEngine', () => {
  let appEngine: AngularAppEngine;

  describe('Localized app', () => {
    beforeAll(() => {
      destroyAngularServerApp();

      setAngularAppEngineManifest({
        // Note: Although we are testing only one locale, we need to configure two or more
        // to ensure that we test a different code path.
        entryPoints: new Map(
          ['it', 'en'].map((locale) => [
            locale,
            async () => {
              @Component({
                standalone: true,
                selector: `app-ssr-${locale}`,
                template: `SSR works ${locale.toUpperCase()}`,
              })
              class SSRComponent {}

              @Component({
                standalone: true,
                selector: `app-ssg-${locale}`,
                template: `SSG works ${locale.toUpperCase()}`,
              })
              class SSGComponent {}

              setAngularAppTestingManifest(
                [
                  { path: 'ssg', component: SSGComponent },
                  { path: 'ssr', component: SSRComponent },
                ],
                [
                  { path: 'ssg', renderMode: RenderMode.Prerender },
                  { path: '**', renderMode: RenderMode.Server },
                ],
                '/' + locale,
                {
                  'ssg/index.html': {
                    size: 25,
                    hash: 'f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde',
                    text: async () => `<html>
                      <head>
                        <title>SSG page</title>
                        <base href="/${locale}" />
                      </head>
                      <body>
                        SSG works ${locale.toUpperCase()}
                      </body>
                    </html>
                  `,
                  },
                },
              );

              return {
                ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp,
                ɵdestroyAngularServerApp: destroyAngularServerApp,
              };
            },
          ]),
        ),
        basePath: '',
      });

      appEngine = new AngularAppEngine();
    });

    describe('handle', () => {
      it('should return null for requests to unknown pages', async () => {
        const request = new Request('https://example.com/unknown/page');
        const response = await appEngine.handle(request);
        expect(response).toBeNull();
      });

      it('should return null for requests with unknown locales', async () => {
        const request = new Request('https://example.com/es/ssr');
        const response = await appEngine.handle(request);
        expect(response).toBeNull();
      });

      it('should return a rendered page with correct locale', async () => {
        const request = new Request('https://example.com/it/ssr');
        const response = await appEngine.handle(request);
        expect(await response?.text()).toContain('SSR works IT');
      });

      it('should correctly render the content when the URL ends with "index.html" with correct locale', async () => {
        const request = new Request('https://example.com/it/ssr/index.html');
        const response = await appEngine.handle(request);
        expect(await response?.text()).toContain('SSR works IT');
      });

      it('should return a serve prerendered page with correct locale', async () => {
        const request = new Request('https://example.com/it/ssg');
        const response = await appEngine.handle(request);
        expect(await response?.text()).toContain('SSG works IT');
      });

      it('should correctly serve the prerendered content when the URL ends with "index.html" with correct locale', async () => {
        const request = new Request('https://example.com/it/ssg/index.html');
        const response = await appEngine.handle(request);
        expect(await response?.text()).toContain('SSG works IT');
      });

      it('should return null for requests to unknown pages in a locale', async () => {
        const request = new Request('https://example.com/it/unknown/page');
        const response = await appEngine.handle(request);
        expect(response).toBeNull();
      });

      it('should return null for requests to file-like resources in a locale', async () => {
        const request = new Request('https://example.com/it/logo.png');
        const response = await appEngine.handle(request);
        expect(response).toBeNull();
      });
    });
  });

  describe('Non-localized app', () => {
    beforeAll(() => {
      destroyAngularServerApp();

      setAngularAppEngineManifest({
        entryPoints: new Map([
          [
            '',
            async () => {
              @Component({
                standalone: true,
                selector: 'app-home',
                template: `Home works`,
              })
              class HomeComponent {}

              setAngularAppTestingManifest(
                [{ path: 'home', component: HomeComponent }],
                [{ path: '**', renderMode: RenderMode.Server }],
              );

              return {
                ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp,
                ɵdestroyAngularServerApp: destroyAngularServerApp,
              };
            },
          ],
        ]),
        basePath: '',
      });

      appEngine = new AngularAppEngine();
    });

    it('should return null for requests to file-like resources', async () => {
      const request = new Request('https://example.com/logo.png');
      const response = await appEngine.handle(request);
      expect(response).toBeNull();
    });

    it('should return null for requests to unknown pages', async () => {
      const request = new Request('https://example.com/unknown/page');
      const response = await appEngine.handle(request);
      expect(response).toBeNull();
    });

    it('should return a rendered page for known paths', async () => {
      const request = new Request('https://example.com/home');
      const response = await appEngine.handle(request);
      expect(await response?.text()).toContain('Home works');
    });

    it('should correctly render the content when the URL ends with "index.html"', async () => {
      const request = new Request('https://example.com/home/index.html');
      const response = await appEngine.handle(request);
      expect(await response?.text()).toContain('Home works');
    });
  });
});
