/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-unassigned-import */
import 'zone.js/node';
import '@angular/compiler';
/* eslint-enable import/no-unassigned-import */

import { Component, ɵresetCompiledComponents } from '@angular/core';
import { AngularServerApp } from '../src/app';
import { ServerRenderContext } from '../src/render';
import { setAngularAppTestingManifest } from './testing-utils';

describe('AngularServerApp', () => {
  let app: AngularServerApp;

  beforeEach(() => {
    // Need to clean up GENERATED_COMP_IDS map in `@angular/core`.
    // Otherwise an incorrect component ID generation collision detected warning will be displayed.
    // See: https://github.com/angular/angular-cli/issues/25924
    ɵresetCompiledComponents();
  });

  beforeAll(() => {
    @Component({
      standalone: true,
      selector: 'app-home',
      template: `Home works`,
    })
    class HomeComponent {}

    setAngularAppTestingManifest([
      { path: 'home', component: HomeComponent },
      { path: 'redirect', redirectTo: 'home' },
      { path: 'redirect/relative', redirectTo: 'home' },
      { path: 'redirect/absolute', redirectTo: '/home' },
    ]);

    app = new AngularServerApp({
      isDevMode: true,
    });
  });

  describe('render', () => {
    it(`should include 'ng-server-context="ssr"' by default`, async () => {
      const response = await app.render(new Request('http://localhost/home'));
      expect(await response?.text()).toContain('ng-server-context="ssr"');
    });

    it(`should include the provided 'ng-server-context' value`, async () => {
      const response = await app.render(
        new Request('http://localhost/home'),
        undefined,
        ServerRenderContext.SSG,
      );
      expect(await response?.text()).toContain('ng-server-context="ssg"');
    });

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

    it('should correctly handle absoloute nested redirects', async () => {
      const response = await app.render(new Request('http://localhost/redirect/absolute'));
      expect(response?.headers.get('location')).toContain('http://localhost/home');
      expect(response?.status).toBe(302);
    });
  });
});
