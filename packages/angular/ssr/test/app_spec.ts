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
import { AngularServerApp, destroyAngularServerApp } from '../src/app';
import { RenderMode } from '../src/routes/route-config';
import { setAngularAppTestingManifest } from './testing-utils';

describe('AngularServerApp', () => {
  let app: AngularServerApp;

  beforeAll(() => {
    destroyAngularServerApp();

    @Component({
      standalone: true,
      selector: 'app-home',
      template: `Home works`,
    })
    class HomeComponent {}

    setAngularAppTestingManifest(
      [
        { path: 'home', component: HomeComponent },
        { path: 'home-csr', component: HomeComponent },
        { path: 'home-ssg', component: HomeComponent },
        { path: 'page-with-headers', component: HomeComponent },
        { path: 'page-with-status', component: HomeComponent },
        { path: 'redirect', redirectTo: 'home' },
        { path: 'redirect/relative', redirectTo: 'home' },
        { path: 'redirect/absolute', redirectTo: '/home' },
      ],
      [
        {
          path: 'home-csr',
          renderMode: RenderMode.Client,
        },
        {
          path: 'home-ssg',
          renderMode: RenderMode.Prerender,
          headers: {
            'X-Some-Header': 'value',
          },
        },
        {
          path: 'page-with-status',
          renderMode: RenderMode.Server,
          status: 201,
        },
        {
          path: 'page-with-headers',
          renderMode: RenderMode.Server,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Some-Header': 'value',
          },
        },
        {
          path: '**',
          renderMode: RenderMode.Server,
        },
      ],
      undefined,
      {
        'home-ssg/index.html': {
          text: async () =>
            `<html>
              <head>
                <title>SSG home page</title>
                <base href="/" />
              </head>
              <body>
                <app-root>Home SSG works</app-root>
              </body>
            </html>
          `,
          size: 28,
          hash: 'f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde',
        },
      },
    );

    app = new AngularServerApp();
  });

  describe('handle', () => {
    describe('CSR and SSG pages', () => {
      it('should correctly render the content for the requested page', async () => {
        const response = await app.handle(new Request('http://localhost/home'));
        expect(await response?.text()).toContain('Home works');
      });

      it(`should correctly render the content when the URL ends with 'index.html'`, async () => {
        const response = await app.handle(new Request('http://localhost/home/index.html'));
        expect(await response?.text()).toContain('Home works');
      });

      it('should correctly handle top level redirects', async () => {
        const response = await app.handle(new Request('http://localhost/redirect'));
        expect(response?.headers.get('location')).toContain('http://localhost/home');
        expect(response?.status).toBe(302);
      });

      it('should correctly handle relative nested redirects', async () => {
        const response = await app.handle(new Request('http://localhost/redirect/relative'));
        expect(response?.headers.get('location')).toContain('http://localhost/redirect/home');
        expect(response?.status).toBe(302);
      });

      it('should correctly handle absolute nested redirects', async () => {
        const response = await app.handle(new Request('http://localhost/redirect/absolute'));
        expect(response?.headers.get('location')).toContain('http://localhost/home');
        expect(response?.status).toBe(302);
      });

      it('should handle request abortion gracefully', async () => {
        const controller = new AbortController();
        const request = new Request('http://localhost/home', { signal: controller.signal });

        // Schedule the abortion of the request in the next microtask
        queueMicrotask(() => {
          controller.abort();
        });

        await expectAsync(app.handle(request)).toBeRejectedWithError(/Request for: .+ was aborted/);
      });

      it('should return configured headers for pages with specific header settings', async () => {
        const response = await app.handle(new Request('http://localhost/page-with-headers'));
        const headers = response?.headers.entries() ?? [];
        expect(Object.fromEntries(headers)).toEqual({
          'cache-control': 'no-cache',
          'x-some-header': 'value',
          'content-type': 'text/html;charset=UTF-8',
        });
      });

      it('should return only default headers for pages without specific header configurations', async () => {
        const response = await app.handle(new Request('http://localhost/home'));
        const headers = response?.headers.entries() ?? [];
        expect(Object.fromEntries(headers)).toEqual({
          'content-type': 'text/html;charset=UTF-8', // default header
        });
      });

      it('should return the configured status for pages with specific status settings', async () => {
        const response = await app.handle(new Request('http://localhost/page-with-status'));
        expect(response?.status).toBe(201);
      });

      it('should return static `index.csr.html` for routes with CSR rendering mode', async () => {
        const response = await app.handle(new Request('http://localhost/home-csr'));
        const content = await response?.text();

        expect(content).toContain('<title>CSR page</title>');
        expect(content).not.toContain('ng-server-context');
      });

      it('should include `ng-server-context="ssr"` for SSR rendering mode', async () => {
        const response = await app.handle(new Request('http://localhost/home'));
        expect(await response?.text()).toContain('ng-server-context="ssr"');
      });
    });

    describe('SSG pages', () => {
      it('should correctly serve the content for the requested prerendered page', async () => {
        const response = await app.handle(new Request('http://localhost/home-ssg'));
        expect(await response?.text()).toContain('Home SSG works');
      });

      it('should return null if the requested prerendered page is accessed with a non-GET and non-HEAD method', async () => {
        const responseHead = await app.handle(
          new Request('http://localhost/home-ssg', { method: 'HEAD' }),
        );
        expect(await responseHead?.text()).toContain('Home SSG works');

        const responsePost = await app.handle(
          new Request('http://localhost/home-ssg', { method: 'POST' }),
        );
        expect(responsePost).toBeNull();
      });

      it(`should correctly serve the content for the requested prerendered page when the URL ends with 'index.html'`, async () => {
        const response = await app.handle(new Request('http://localhost/home-ssg/index.html'));
        expect(await response?.text()).toContain('Home SSG works');
      });

      it('should return configured headers for pages with specific header settings', async () => {
        const response = await app.handle(new Request('http://localhost/home-ssg'));
        const headers = response?.headers.entries() ?? [];
        expect(Object.fromEntries(headers)).toEqual({
          'etag': '"f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde"',
          'content-length': '28',
          'x-some-header': 'value',
          'content-type': 'text/html;charset=UTF-8',
        });
      });

      it('should return 304 Not Modified when ETag matches', async () => {
        const url = 'http://localhost/home-ssg';

        const initialResponse = await app.handle(new Request(url));
        const etag = initialResponse?.headers.get('etag');

        expect(etag).toBeDefined();

        const conditionalResponse = await app.handle(
          new Request(url, {
            headers: {
              'If-None-Match': etag as string,
            },
          }),
        );

        // Check that the response status is 304 Not Modified
        expect(conditionalResponse?.status).toBe(304);
        expect(await conditionalResponse?.text()).toBe('');
      });

      it('should return configured headers for pages with specific header settings', async () => {
        const response = await app.handle(new Request('http://localhost/home-ssg'));
        const headers = response?.headers.entries() ?? [];
        expect(Object.fromEntries(headers)).toEqual({
          'etag': '"f799132d0a09e0fef93c68a12e443527700eb59e6f67fcb7854c3a60ff082fde"',
          'content-length': '28',
          'x-some-header': 'value',
          'content-type': 'text/html;charset=UTF-8',
        });
      });

      it('should return null for a non-prerendered page', async () => {
        const response = await app.handle(new Request('http://localhost/unknown'));
        expect(response).toBeNull();
      });
    });
  });
});
