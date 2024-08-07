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

import { Component } from '@angular/core';
import { AngularServerApp } from '../src/app';
import { ServerRenderContext } from '../src/render';
import { setAngularAppTestingManifest } from './testing-utils';

describe('AngularServerApp', () => {
  let app: AngularServerApp;

  beforeAll(() => {
    @Component({
      standalone: true,
      selector: 'app-home',
      template: `Home works`,
    })
    class HomeComponent {}

    setAngularAppTestingManifest([{ path: 'home', component: HomeComponent }]);

    app = new AngularServerApp({
      isDevMode: true,
    });
  });

  describe('render', () => {
    it(`should include 'ng-server-context="ssr"' by default`, async () => {
      const response = await app.render(new Request('http://localhost/home'));
      expect(await response.text()).toContain('ng-server-context="ssr"');
    });

    it(`should include the provided 'ng-server-context' value`, async () => {
      const response = await app.render(
        new Request('http://localhost/home'),
        undefined,
        ServerRenderContext.SSG,
      );
      expect(await response.text()).toContain('ng-server-context="ssg"');
    });

    it('should correctly render the content for the requested page', async () => {
      const response = await app.render(new Request('http://localhost/home'));
      expect(await response.text()).toContain('Home works');
    });

    it(`should correctly render the content when the URL ends with 'index.html'`, async () => {
      const response = await app.render(new Request('http://localhost/home/index.html'));
      expect(await response.text()).toContain('Home works');
    });
  });

  describe('getServerAsset', () => {
    it('should return the content of an existing asset', async () => {
      const content = await app.getServerAsset('index.server.html');
      expect(content).toContain('<html>');
    });

    it('should throw an error if the asset does not exist', async () => {
      await expectAsync(app.getServerAsset('nonexistent.html')).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(`Server asset 'nonexistent.html' does not exist`),
        }),
      );
    });
  });
});
