/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-unassigned-import */
import '@angular/compiler';
/* eslint-enable import/no-unassigned-import */

import { Component } from '@angular/core';
import { destroyAngularServerApp, getOrCreateAngularServerApp } from '../src/app';
import { AngularAppEngine } from '../src/app-engine';
import { setAngularAppEngineManifest } from '../src/manifest';
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
                selector: `app-home-${locale}`,
                template: `Home works ${locale.toUpperCase()}`,
              })
              class HomeComponent {}

              setAngularAppTestingManifest([{ path: 'home', component: HomeComponent }], locale);

              return {
                ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp,
                ɵdestroyAngularServerApp: destroyAngularServerApp,
              };
            },
          ]),
        ),
        basePath: '',
        staticPathsHeaders: new Map([
          [
            '/about',
            [
              ['Cache-Control', 'no-cache'],
              ['X-Some-Header', 'value'],
            ],
          ],
        ]),
      });

      appEngine = new AngularAppEngine();
    });

    describe('render', () => {
      it('should return null for requests to unknown pages', async () => {
        const request = new Request('https://example.com/unknown/page');
        const response = await appEngine.render(request);
        expect(response).toBeNull();
      });

      it('should return null for requests with unknown locales', async () => {
        const request = new Request('https://example.com/es/home');
        const response = await appEngine.render(request);
        expect(response).toBeNull();
      });

      it('should return a rendered page with correct locale', async () => {
        const request = new Request('https://example.com/it/home');
        const response = await appEngine.render(request);
        expect(await response?.text()).toContain('Home works IT');
      });

      it('should correctly render the content when the URL ends with "index.html" with correct locale', async () => {
        const request = new Request('https://example.com/it/home/index.html');
        const response = await appEngine.render(request);
        expect(await response?.text()).toContain('Home works IT');
      });

      it('should return null for requests to unknown pages in a locale', async () => {
        const request = new Request('https://example.com/it/unknown/page');
        const response = await appEngine.render(request);
        expect(response).toBeNull();
      });

      it('should return null for requests to file-like resources in a locale', async () => {
        const request = new Request('https://example.com/it/logo.png');
        const response = await appEngine.render(request);
        expect(response).toBeNull();
      });
    });

    describe('getHeaders', () => {
      it('should return headers for a known path without index.html', () => {
        const request = new Request('https://example.com/about');
        const headers = appEngine.getHeaders(request);
        expect(Object.fromEntries(headers.entries())).toEqual({
          'Cache-Control': 'no-cache',
          'X-Some-Header': 'value',
        });
      });

      it('should return headers for a known path with index.html', () => {
        const request = new Request('https://example.com/about/index.html');
        const headers = appEngine.getHeaders(request);
        expect(Object.fromEntries(headers.entries())).toEqual({
          'Cache-Control': 'no-cache',
          'X-Some-Header': 'value',
        });
      });

      it('should return no headers for unknown paths', () => {
        const request = new Request('https://example.com/unknown/path');
        const headers = appEngine.getHeaders(request);
        expect(headers).toHaveSize(0);
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

              setAngularAppTestingManifest([{ path: 'home', component: HomeComponent }]);

              return {
                ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp,
                ɵdestroyAngularServerApp: destroyAngularServerApp,
              };
            },
          ],
        ]),
        basePath: '',
        staticPathsHeaders: new Map(),
      });

      appEngine = new AngularAppEngine();
    });

    it('should return null for requests to file-like resources', async () => {
      const request = new Request('https://example.com/logo.png');
      const response = await appEngine.render(request);
      expect(response).toBeNull();
    });

    it('should return null for requests to unknown pages', async () => {
      const request = new Request('https://example.com/unknown/page');
      const response = await appEngine.render(request);
      expect(response).toBeNull();
    });

    it('should return a rendered page for known paths', async () => {
      const request = new Request('https://example.com/home');
      const response = await appEngine.render(request);
      expect(await response?.text()).toContain('Home works');
    });

    it('should correctly render the content when the URL ends with "index.html"', async () => {
      const request = new Request('https://example.com/home/index.html');
      const response = await appEngine.render(request);
      expect(await response?.text()).toContain('Home works');
    });
  });
});
