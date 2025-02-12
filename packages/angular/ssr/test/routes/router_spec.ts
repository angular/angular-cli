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
import { AngularAppManifest, getAngularAppManifest } from '../../src/manifest';
import { RenderMode } from '../../src/routes/route-config';
import { ServerRouter } from '../../src/routes/router';
import { setAngularAppTestingManifest } from '../testing-utils';

describe('ServerRouter', () => {
  let router: ServerRouter;
  let manifest: AngularAppManifest;

  beforeAll(() => {
    @Component({
      standalone: true,
      selector: 'app-dummy',
      template: `dummy works`,
    })
    class DummyComponent {}

    setAngularAppTestingManifest(
      [
        { path: 'home', component: DummyComponent },
        { path: 'redirect', redirectTo: 'home' },
        { path: 'encoding url', component: DummyComponent },
        { path: 'user/:id', component: DummyComponent },
      ],
      [
        { path: 'redirect', renderMode: RenderMode.Server, status: 301 },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    manifest = getAngularAppManifest();
  });

  describe('from', () => {
    it('should build the route tree', async () => {
      router = await ServerRouter.from(manifest, new URL('http://localhost'));

      // Check that routes are correctly built
      expect(router.match(new URL('http://localhost/home'))).toEqual({
        route: '/home',
        renderMode: RenderMode.Server,
      });
      expect(router.match(new URL('http://localhost/redirect'))).toEqual({
        redirectTo: '/home',
        route: '/redirect',
        renderMode: RenderMode.Server,
        status: 301,
      });
      expect(router.match(new URL('http://localhost/user/123'))).toEqual({
        route: '/user/*',
        renderMode: RenderMode.Server,
      });
    });

    it('should return the existing promise if a build from is already in progress', () => {
      const promise1 = ServerRouter.from(manifest, new URL('http://localhost'));
      const promise2 = ServerRouter.from(manifest, new URL('http://localhost'));

      expect(promise1).toBe(promise2); // Ensure both promises are the same
    });
  });

  describe('match', () => {
    beforeAll(async () => {
      router = await ServerRouter.from(manifest, new URL('http://localhost'));
    });

    it('should match a URL to the route tree metadata', () => {
      const homeMetadata = router.match(new URL('http://localhost/home'));
      const redirectMetadata = router.match(new URL('http://localhost/redirect'));
      const userMetadata = router.match(new URL('http://localhost/user/123'));

      expect(homeMetadata).toEqual({
        route: '/home',
        renderMode: RenderMode.Server,
      });
      expect(redirectMetadata).toEqual({
        redirectTo: '/home',
        route: '/redirect',
        status: 301,
        renderMode: RenderMode.Server,
      });
      expect(userMetadata).toEqual({
        route: '/user/*',
        renderMode: RenderMode.Server,
      });
    });

    it('should correctly match URLs ending with /index.html', () => {
      const homeMetadata = router.match(new URL('http://localhost/home/index.html'));
      const userMetadata = router.match(new URL('http://localhost/user/123/index.html'));
      const redirectMetadata = router.match(new URL('http://localhost/redirect/index.html'));

      expect(homeMetadata).toEqual({
        route: '/home',
        renderMode: RenderMode.Server,
      });
      expect(redirectMetadata).toEqual({
        redirectTo: '/home',
        route: '/redirect',
        status: 301,
        renderMode: RenderMode.Server,
      });
      expect(userMetadata).toEqual({
        route: '/user/*',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle encoded URLs', () => {
      const encodedUserMetadata = router.match(new URL('http://localhost/encoding%20url'));
      expect(encodedUserMetadata).toEqual({
        route: '/encoding url',
        renderMode: RenderMode.Server,
      });
    });
  });
});
