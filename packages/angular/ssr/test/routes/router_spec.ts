/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Component } from '@angular/core';
import { getAngularAppManifest } from '../../src/manifest';
import { ServerRouter } from '../../src/routes/router';
import { setAngularAppTestingManifest } from '../testing-utils';

describe('ServerRouter', () => {
  let router: ServerRouter;

  beforeAll(async () => {
    @Component({
      standalone: true,
      selector: 'app-dummy',
      template: `dummy works`,
    })
    class DummyComponent {}

    setAngularAppTestingManifest([
      { path: 'home', component: DummyComponent },
      { path: 'redirect', redirectTo: 'home' },
      { path: 'encoding url', component: DummyComponent },
      { path: 'user/:id', component: DummyComponent },
    ]);

    const manifest = getAngularAppManifest();
    router = new ServerRouter(manifest);
  });

  function buildRoutes(): Promise<void> {
    return router.buildRoutes(new URL('http://localhost'), '<app-root></app-root>');
  }

  describe('buildRoutes', () => {
    it('should build the route tree and set requiresRoutesToBeBuilt to false', async () => {
      await buildRoutes();

      // Test that the route tree is built
      expect(router.requiresRoutesToBeBuilt).toBeFalse();

      // Check that routes are correctly built
      expect(router.match(new URL('http://localhost/home'))).toEqual({
        route: '/home',
        redirectTo: undefined,
      });
      expect(router.match(new URL('http://localhost/redirect'))).toEqual({
        redirectTo: '/home',
        route: '/redirect',
      });
      expect(router.match(new URL('http://localhost/user/123'))).toEqual({
        route: '/user/:id',
        redirectTo: undefined,
      });
    });

    it('should return the existing promise if a build is already in progress', () => {
      expect(buildRoutes()).toBe(buildRoutes()); // Ensure both promises are the same
    });
  });

  describe('match', () => {
    beforeAll(async () => {
      await buildRoutes();
    });

    it('should match a URL to the route tree metadata', () => {
      const homeMetadata = router.match(new URL('http://localhost/home'));
      const redirectMetadata = router.match(new URL('http://localhost/redirect'));
      const userMetadata = router.match(new URL('http://localhost/user/123'));

      expect(homeMetadata).toEqual({ route: '/home', redirectTo: undefined });
      expect(redirectMetadata).toEqual({ redirectTo: '/home', route: '/redirect' });
      expect(userMetadata).toEqual({ route: '/user/:id', redirectTo: undefined });
    });

    it('should correctly match URLs ending with /index.html', () => {
      const homeMetadata = router.match(new URL('http://localhost/home/index.html'));
      const userMetadata = router.match(new URL('http://localhost/user/123/index.html'));
      const redirectMetadata = router.match(new URL('http://localhost/redirect/index.html'));

      expect(homeMetadata).toEqual({ route: '/home', redirectTo: undefined });
      expect(redirectMetadata).toEqual({ redirectTo: '/home', route: '/redirect' });
      expect(userMetadata).toEqual({ route: '/user/:id', redirectTo: undefined });
    });

    it('should handle encoded URLs', () => {
      const encodedUserMetadata = router.match(new URL('http://localhost/encoding%20url'));
      expect(encodedUserMetadata).toEqual({ route: '/encoding url', redirectTo: undefined });
    });

    it('should throw an error if the route tree has not been built', () => {
      const unbuiltRouter = new ServerRouter({
        inlineCriticalCss: false,
        bootstrap: undefined as never,
        assets: {},
      });

      expect(() => unbuiltRouter.match(new URL('http://localhost/home'))).toThrowError(
        "Router route tree is undefined. Did you call 'buildRoutes'?",
      );
    });
  });
});
