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
    );

    app = new AngularServerApp();
  });

  describe('render', () => {
    it('should correctly render the content for the requested page', async () => {
      const response = await app.render(new Request('http://localhost/home'));
      expect(await response?.text()).toContain('Home works');
    });

    it(`should correctly render the content when the URL ends with 'index.html'`, async () => {
      const response = await app.render(new Request('http://localhost/home/index.html'));
      expect(await response?.text()).toContain('Home works');
    });

    it('should correctly handle top level redirects', async () => {
      const response = await app.render(new Request('http://localhost/redirect'));
      expect(response?.headers.get('location')).toContain('http://localhost/home');
      expect(response?.status).toBe(302);
    });

    it('should correctly handle relative nested redirects', async () => {
      const response = await app.render(new Request('http://localhost/redirect/relative'));
      expect(response?.headers.get('location')).toContain('http://localhost/redirect/home');
      expect(response?.status).toBe(302);
    });

    it('should correctly handle absolute nested redirects', async () => {
      const response = await app.render(new Request('http://localhost/redirect/absolute'));
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

      await expectAsync(app.render(request)).toBeRejectedWithError(/Request for: .+ was aborted/);
    });

    it('should return configured headers for pages with specific header settings', async () => {
      const response = await app.render(new Request('http://localhost/page-with-headers'));
      const headers = response?.headers.entries() ?? [];
      expect(Object.fromEntries(headers)).toEqual({
        'cache-control': 'no-cache',
        'x-some-header': 'value',
        'content-type': 'text/html;charset=UTF-8',
      });
    });

    it('should return only default headers for pages without specific header configurations', async () => {
      const response = await app.render(new Request('http://localhost/home'));
      const headers = response?.headers.entries() ?? [];
      expect(Object.fromEntries(headers)).toEqual({
        'content-type': 'text/html;charset=UTF-8', // default header
      });
    });

    it('should return the configured status for pages with specific status settings', async () => {
      const response = await app.render(new Request('http://localhost/page-with-status'));
      expect(response?.status).toBe(201);
    });

    it('should return static `index.csr.html` for routes with CSR rendering mode', async () => {
      const response = await app.render(new Request('http://localhost/home-csr'));
      const content = await response?.text();

      expect(content).toContain('<title>CSR page</title>');
      expect(content).not.toContain('ng-server-context');
    });

    it('should include `ng-server-context="ssr"` for SSR rendering mode', async () => {
      const response = await app.render(new Request('http://localhost/home'));
      expect(await response?.text()).toContain('ng-server-context="ssr"');
    });
  });
});
