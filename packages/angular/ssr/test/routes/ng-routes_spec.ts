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

import { Component, InjectionToken, Injector, inject } from '@angular/core';
import {
  Route,
  Routes,
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { IS_DISCOVERING_ROUTES, extractRoutesAndCreateRouteTree } from '../../src/routes/ng-routes';
import { PrerenderFallback, RenderMode } from '../../src/routes/route-config';
import { setAngularAppTestingManifest } from '../testing-utils';

describe('extractRoutesAndCreateRouteTree', () => {
  const url = new URL('http://localhost');

  @Component({
    selector: 'app-dummy-comp',
    template: `dummy works`,
  })
  class DummyComponent {}

  it('should extract routes and create a route tree', async () => {
    setAngularAppTestingManifest(
      [
        { path: '', component: DummyComponent },
        { path: 'home', component: DummyComponent },
        { path: 'redirect', redirectTo: 'home' },
        { path: 'user/:id', component: DummyComponent },
      ],
      [
        { path: 'home', renderMode: RenderMode.Client },
        { path: 'redirect', renderMode: RenderMode.Server, status: 301 },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Server },
      { route: '/home', renderMode: RenderMode.Client },
      { route: '/redirect', renderMode: RenderMode.Server, status: 301, redirectTo: '/home' },
      { route: '/user/*', renderMode: RenderMode.Server },
    ]);
  });

  describe('route configuration validation', () => {
    it('should error when a redirect uses an invalid status code', async () => {
      setAngularAppTestingManifest(
        [{ path: '', redirectTo: () => 'home', pathMatch: 'full' }],
        [{ path: '', renderMode: RenderMode.Server, status: 404 }],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(`The '404' status code is not a valid redirect response code.`);
    });

    it(`should error when a route starts with a '/'`, async () => {
      setAngularAppTestingManifest(
        [{ path: 'home', component: DummyComponent }],
        [
          // This path starts with a slash, which should trigger an error
          { path: '/invalid', renderMode: RenderMode.Client },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `Invalid '/invalid' route configuration: the path cannot start with a slash.`,
      );
    });

    it("should error when 'getPrerenderParams' is used with a '*' route", async () => {
      setAngularAppTestingManifest(
        [{ path: 'invalid/:id', component: DummyComponent }],
        [
          {
            path: 'invalid/*',
            renderMode: RenderMode.Prerender,
            getPrerenderParams() {
              return Promise.resolve([]);
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        "Invalid 'invalid/*' route configuration: 'getPrerenderParams' cannot be used with a '*' route.",
      );
    });

    it("should error when 'getPrerenderParams' produces a protocol-relative path", async () => {
      setAngularAppTestingManifest(
        [{ path: ':slug', component: DummyComponent }],
        [
          {
            path: ':slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: '/evil.example' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The ':slug' route produced an invalid prerender path: ` +
          `'//evil.example' is not a valid same-origin path.`,
      );
    });

    it("should error when 'getPrerenderParams' produces a path containing a backslash", async () => {
      setAngularAppTestingManifest(
        [{ path: 'docs/:id', component: DummyComponent }],
        [
          {
            path: 'docs/:id',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ id: '\\evil.example' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The 'docs/:id' route produced an invalid prerender path: ` +
          `'/docs/\\evil.example' is not a valid same-origin path.`,
      );
    });

    it("should error when a 'redirectTo' is protocol-relative", async () => {
      setAngularAppTestingManifest(
        [
          { path: 'home', component: DummyComponent },
          { path: 'redirect', redirectTo: '//evil.example' },
        ],
        [{ path: '**', renderMode: RenderMode.Server }],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `The 'redirectTo' value for the 'redirect' route is invalid: ` +
          `'//evil.example' is not a valid same-origin path.`,
      );
    });

    it("should error when a server route 'headers.Location' uses an unsupported protocol", async () => {
      setAngularAppTestingManifest(
        [{ path: 'external', component: DummyComponent }],
        [
          {
            path: 'external',
            renderMode: RenderMode.Prerender,
            headers: { Location: 'javascript:alert(1)' },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `Invalid 'external' route configuration: the 'headers.Location' value is invalid: ` +
          `the 'javascript:' protocol is not supported as a redirect target.`,
      );
    });

    it("should error when a server route 'headers.Location' contains a backslash", async () => {
      setAngularAppTestingManifest(
        [{ path: 'external', component: DummyComponent }],
        [
          {
            path: 'external',
            renderMode: RenderMode.Prerender,
            headers: { Location: '/\\evil.example' },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `Invalid 'external' route configuration: the 'headers.Location' value is invalid: ` +
          `'/\\evil.example' is not a valid same-origin path.`,
      );
    });

    it("should error when a server route 'headers.Location' resolves into a protocol-relative path", async () => {
      setAngularAppTestingManifest(
        [{ path: 'external', component: DummyComponent }],
        [
          {
            path: 'external',
            renderMode: RenderMode.Server,
            status: 302,
            headers: { Location: '/..//evil.example' },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `Invalid 'external' route configuration: the 'headers.Location' value is invalid: ` +
          `'/..//evil.example' is not a valid same-origin path. ` +
          `It resolves to the protocol-relative path '//evil.example'.`,
      );
    });

    it("should error when a server route 'headers.Location' uses an unsupported protocol regardless of the header casing", async () => {
      setAngularAppTestingManifest(
        [{ path: 'external', component: DummyComponent }],
        [
          {
            path: 'external',
            renderMode: RenderMode.Prerender,
            headers: { LoCaTiOn: 'javascript:alert(1)' },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `Invalid 'external' route configuration: the 'headers.Location' value is invalid: ` +
          `the 'javascript:' protocol is not supported as a redirect target.`,
      );
    });

    it("should store the normalized value of a server route 'headers.Location'", async () => {
      setAngularAppTestingManifest(
        [{ path: 'external', component: DummyComponent }],
        [
          {
            path: 'external',
            renderMode: RenderMode.Server,
            headers: { location: 'HTTPS://Example.com/A b' },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors).toHaveSize(0);
      expect(routeTree.match('/external')?.headers).toEqual({
        location: 'https://example.com/A%20b',
      });
    });

    it("should error when 'getPrerenderParams' produces a segment which decodes to a separator", async () => {
      setAngularAppTestingManifest(
        [{ path: 'store/:slug', component: DummyComponent }],
        [
          {
            path: 'store/:slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: 'foo%2Fbar' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The 'store/:slug' route produced an invalid prerender path: ` +
          `'/store/foo%2Fbar' is not a valid route path. ` +
          `The 'foo%2Fbar' segment decodes to a value which is not a single path segment.`,
      );
    });

    it("should error when 'getPrerenderParams' produces an encoded dot segment", async () => {
      setAngularAppTestingManifest(
        [{ path: 'store/:slug', component: DummyComponent }],
        [
          {
            path: 'store/:slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: '%2E%2E' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The 'store/:slug' route produced an invalid prerender path: ` +
          `'/store/%2E%2E' is not a valid route path. ` +
          `The '%2E%2E' segment decodes to the '..' path traversal segment.`,
      );
    });

    it("should error when 'getPrerenderParams' produces a malformed percent escape", async () => {
      setAngularAppTestingManifest(
        [{ path: 'store/:slug', component: DummyComponent }],
        [
          {
            path: 'store/:slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: '50%' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The 'store/:slug' route produced an invalid prerender path: ` +
          `'/store/50%' is not a valid route path. ` +
          `The '50%' segment is not a valid percent-encoded value.`,
      );
    });

    it(`should not error when a catch-all route didn't match any Angular route`, async () => {
      setAngularAppTestingManifest(
        [{ path: 'home', component: DummyComponent }],
        [
          { path: 'home', renderMode: RenderMode.Server },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: false,
        includePrerenderFallbackRoutes: false,
      });

      expect(errors).toHaveSize(0);
    });

    it('should error when a route is not defined in the server routing configuration', async () => {
      setAngularAppTestingManifest(
        [{ path: 'home', component: DummyComponent }],
        [
          { path: 'home', renderMode: RenderMode.Server },
          { path: 'invalid', renderMode: RenderMode.Server },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: false,
        includePrerenderFallbackRoutes: false,
      });

      expect(errors).toHaveSize(1);
      expect(errors[0]).toContain(
        `The 'invalid' server route does not match any routes defined in the Angular routing configuration`,
      );
    });

    it('should error when a server route is not defined in the Angular routing configuration', async () => {
      setAngularAppTestingManifest(
        [
          { path: 'home', component: DummyComponent },
          { path: 'invalid', component: DummyComponent },
        ],
        [{ path: 'home', renderMode: RenderMode.Server }],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: false,
        includePrerenderFallbackRoutes: false,
      });

      expect(errors).toHaveSize(1);
      expect(errors[0]).toContain(
        `The 'invalid' route does not match any route defined in the server routing configuration`,
      );
    });

    it('should error when a route with a matcher when render mode is Prerender.', async () => {
      setAngularAppTestingManifest(
        [{ matcher: () => null, component: DummyComponent }],
        [
          {
            path: '**',
            renderMode: RenderMode.Prerender,
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        `The route '**' is set for prerendering but has a defined matcher. ` +
          `Routes with matchers cannot use prerendering. Please specify a different 'renderMode'.`,
      );
    });
  });

  describe('when `invokeGetPrerenderParams` is true', () => {
    it("should allow 'getPrerenderParams' values containing apostrophes and spaces", async () => {
      setAngularAppTestingManifest(
        [{ path: 'store/:slug', component: DummyComponent }],
        [
          {
            path: 'store/:slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: `customer's-choice` }, { slug: 'summer sale' }];
            },
          },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });
      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: `/store/customer's-choice`, renderMode: RenderMode.Prerender },
        { route: '/store/summer sale', renderMode: RenderMode.Prerender },
      ]);
    });

    it('should keep the first route when a prerendered path collides with a literal route', async () => {
      // A prerendered path is normalized by the URL parser while a literal route path is not, so
      // the two reach the route tree in a different encoding even though they are the same node.
      setAngularAppTestingManifest(
        [
          { path: 'produits/café', component: DummyComponent },
          { path: 'produits/:slug', component: DummyComponent },
        ],
        [
          { path: 'produits/café', renderMode: RenderMode.Server, status: 201 },
          {
            path: 'produits/:slug',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ slug: 'café' }];
            },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/produits/café', renderMode: RenderMode.Server, status: 201 },
      ]);
    });

    it('should resolve parameterized routes for SSG and add a fallback route if fallback is Server', async () => {
      setAngularAppTestingManifest(
        [{ path: 'user/:id/role/:role', component: DummyComponent }],
        [
          {
            path: 'user/:id/role/:role',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.Server,
            async getPrerenderParams() {
              return [
                { id: 'joe', role: 'admin' },
                { id: 'jane', role: 'writer' },
              ];
            },
          },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });
      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
        {
          route: '/user/jane/role/writer',
          renderMode: RenderMode.Prerender,
        },
        { route: '/user/*/role/*', renderMode: RenderMode.Server },
      ]);
    });

    it('should resolve parameterized routes for SSG and add a fallback route if fallback is Client', async () => {
      setAngularAppTestingManifest(
        [
          { path: 'home', component: DummyComponent },
          { path: 'user/:id/role/:role', component: DummyComponent },
        ],
        [
          {
            path: 'user/:id/role/:role',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.Client,
            async getPrerenderParams() {
              return [
                { id: 'joe', role: 'admin' },
                { id: 'jane', role: 'writer' },
              ];
            },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });
      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/home', renderMode: RenderMode.Server },
        { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
        {
          route: '/user/jane/role/writer',
          renderMode: RenderMode.Prerender,
        },
        { route: '/user/*/role/*', renderMode: RenderMode.Client },
      ]);
    });

    it('should resolve parameterized routes for SSG add a fallback route if fallback is Server', async () => {
      setAngularAppTestingManifest(
        [
          { path: 'home', component: DummyComponent },
          { path: 'user/:id/role/:role', component: DummyComponent },
        ],
        [
          {
            path: 'user/:id/role/:role',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [
                { id: 'joe', role: 'admin' },
                { id: 'jane', role: 'writer' },
              ];
            },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });
      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/home', renderMode: RenderMode.Server },
        { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
        {
          route: '/user/jane/role/writer',
          renderMode: RenderMode.Prerender,
        },
      ]);
    });

    it('should resolve catch all routes for SSG and add a fallback route if fallback is Server', async () => {
      setAngularAppTestingManifest(
        [
          { path: 'home', component: DummyComponent },
          { path: 'user/:name/**', component: DummyComponent },
        ],
        [
          {
            path: 'user/:name/**',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.Server,
            async getPrerenderParams() {
              return [
                { name: 'joe', '**': 'role/admin' },
                { name: 'jane', '**': 'role/writer' },
              ];
            },
          },
          { path: '**', renderMode: RenderMode.Server },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });
      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/home', renderMode: RenderMode.Server },
        { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
        {
          route: '/user/jane/role/writer',
          renderMode: RenderMode.Prerender,
        },
        { route: '/user/*/**', renderMode: RenderMode.Server },
      ]);
    });

    it('should resolve a catch-all value which carries the leading separator', async () => {
      // The documented value of a '**' parameter is a path such as '/foo/bar', which already
      // carries the separator that the matched '/**' placeholder includes. A root catch-all is the
      // case where re-adding it composes a protocol-relative '//foo/bar'.
      setAngularAppTestingManifest(
        [{ path: '**', component: DummyComponent }],
        [
          {
            path: '**',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ '**': '/foo/bar' }, { '**': 'foo/baz' }];
            },
          },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/foo/bar', renderMode: RenderMode.Prerender },
        { route: '/foo/baz', renderMode: RenderMode.Prerender },
      ]);
    });

    it('should still reject a catch-all value which is itself protocol-relative', async () => {
      setAngularAppTestingManifest(
        [{ path: '**', component: DummyComponent }],
        [
          {
            path: '**',
            renderMode: RenderMode.Prerender,
            fallback: PrerenderFallback.None,
            async getPrerenderParams() {
              return [{ '**': '//evil.example' }];
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
      });

      expect(errors[0]).toContain(
        `The '**' route produced an invalid prerender path: ` +
          `'//evil.example' is not a valid same-origin path.`,
      );
    });

    it('should extract nested redirects that are not explicitly defined.', async () => {
      setAngularAppTestingManifest(
        [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'some',
          },
          {
            path: ':param',
            children: [
              {
                path: '',
                pathMatch: 'full',
                redirectTo: 'thing',
              },
              {
                path: 'thing',
                component: DummyComponent,
              },
            ],
          },
        ],
        [
          {
            path: ':param',
            renderMode: RenderMode.Prerender,
            async getPrerenderParams() {
              return [{ param: 'some' }];
            },
          },
          { path: '**', renderMode: RenderMode.Prerender },
        ],
      );

      const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
        url,
        invokeGetPrerenderParams: true,
        includePrerenderFallbackRoutes: true,
      });

      expect(errors).toHaveSize(0);
      expect(routeTree.toObject()).toEqual([
        { route: '/', renderMode: RenderMode.Prerender, redirectTo: '/some' },
        { route: '/some', renderMode: RenderMode.Prerender, redirectTo: '/some/thing' },
        { route: '/some/thing', renderMode: RenderMode.Prerender },
        { redirectTo: '/*/thing', route: '/*', renderMode: RenderMode.Server },
        { route: '/*/thing', renderMode: RenderMode.Server },
      ]);
    });
  });

  it('should extract routes with a route level matcher', async () => {
    setAngularAppTestingManifest(
      [
        {
          path: '',
          component: DummyComponent,
        },
        {
          path: 'product',
          component: DummyComponent,
          children: [
            {
              path: '',
              component: DummyComponent,
            },
            {
              matcher: () => null,
              component: DummyComponent,
            },
            {
              path: 'list',
              component: DummyComponent,
            },
          ],
        },
      ],
      [
        { path: '**', renderMode: RenderMode.Client },
        { path: 'product', renderMode: RenderMode.Client },
        { path: 'product/*', renderMode: RenderMode.Client },
        { path: 'product/**/overview/details', renderMode: RenderMode.Server },
        { path: 'product/**/overview', renderMode: RenderMode.Server },
        { path: 'product/**/overview/about', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Client },
      { route: '/product', renderMode: RenderMode.Client },
      { route: '/product/**/overview', renderMode: RenderMode.Server },
      { route: '/product/**/overview/details', renderMode: RenderMode.Server },
      { route: '/product/**/overview/about', renderMode: RenderMode.Server },
      { route: '/product/list', renderMode: RenderMode.Client },
    ]);
  });

  it('should extract routes with a route level matcher captured by "**"', async () => {
    setAngularAppTestingManifest(
      [
        {
          path: '',
          component: DummyComponent,
        },
        {
          path: 'list',
          component: DummyComponent,
        },
        {
          path: 'product',
          component: DummyComponent,
          children: [
            {
              matcher: () => null,
              component: DummyComponent,
            },
          ],
        },
      ],
      [
        { path: 'list', renderMode: RenderMode.Client },
        { path: '', renderMode: RenderMode.Client },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Client },
      { route: '/list', renderMode: RenderMode.Client },
      { route: '/product', renderMode: RenderMode.Server },
      { route: '/**', renderMode: RenderMode.Server },
    ]);
  });

  it('should extract nested redirects that are not explicitly defined.', async () => {
    setAngularAppTestingManifest(
      [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'some',
        },
        {
          path: ':param',
          children: [
            {
              path: '',
              pathMatch: 'full',
              redirectTo: 'thing',
            },
            {
              path: 'thing',
              component: DummyComponent,
            },
          ],
        },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Server, redirectTo: '/some' },
      { route: '/*', renderMode: RenderMode.Server, redirectTo: '/*/thing' },
      { route: '/*/thing', renderMode: RenderMode.Server },
    ]);
  });

  it('should extract nested redirects with multiple path parameters', async () => {
    setAngularAppTestingManifest(
      [
        {
          path: ':param1/:param2',
          children: [
            {
              path: '',
              pathMatch: 'full',
              redirectTo: 'thing',
            },
            {
              path: 'thing',
              component: DummyComponent,
            },
          ],
        },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/*/*', renderMode: RenderMode.Server, redirectTo: '/*/*/thing' },
      { route: '/*/*/thing', renderMode: RenderMode.Server },
    ]);
  });

  it('should not resolve parameterized routes for SSG when `invokeGetPrerenderParams` is false', async () => {
    setAngularAppTestingManifest(
      [
        { path: 'home', component: DummyComponent },
        { path: 'user/:id/role/:role', component: DummyComponent },
      ],
      [
        {
          path: 'user/:id/role/:role',
          renderMode: RenderMode.Prerender,
          async getPrerenderParams() {
            return [
              { id: 'joe', role: 'admin' },
              { id: 'jane', role: 'writer' },
            ];
          },
        },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: false,
    });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/home', renderMode: RenderMode.Server },
      { route: '/user/*/role/*', renderMode: RenderMode.Server },
    ]);
  });

  it('should not include fallback routes for SSG when `includePrerenderFallbackRoutes` is false', async () => {
    setAngularAppTestingManifest(
      [
        { path: 'home', component: DummyComponent },
        { path: 'user/:id/role/:role', component: DummyComponent },
      ],
      [
        {
          path: 'user/:id/role/:role',
          fallback: PrerenderFallback.Client,
          renderMode: RenderMode.Prerender,
          async getPrerenderParams() {
            return [
              { id: 'joe', role: 'admin' },
              { id: 'jane', role: 'writer' },
            ];
          },
        },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: true,
      includePrerenderFallbackRoutes: false,
    });

    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/home', renderMode: RenderMode.Server },
      { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
      {
        route: '/user/jane/role/writer',
        renderMode: RenderMode.Prerender,
      },
    ]);
  });

  it('should include fallback routes for SSG when `includePrerenderFallbackRoutes` is true', async () => {
    setAngularAppTestingManifest(
      [
        { path: 'home', component: DummyComponent },
        { path: 'user/:id/role/:role', component: DummyComponent },
      ],
      [
        {
          path: 'user/:id/role/:role',
          renderMode: RenderMode.Prerender,
          fallback: PrerenderFallback.Client,
          async getPrerenderParams() {
            return [
              { id: 'joe', role: 'admin' },
              { id: 'jane', role: 'writer' },
            ];
          },
        },
        { path: '**', renderMode: RenderMode.Server },
      ],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: true,
      includePrerenderFallbackRoutes: true,
    });

    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/home', renderMode: RenderMode.Server },
      { route: '/user/joe/role/admin', renderMode: RenderMode.Prerender },
      {
        route: '/user/jane/role/writer',
        renderMode: RenderMode.Prerender,
      },
      { route: '/user/*/role/*', renderMode: RenderMode.Client },
    ]);
  });

  it('should use wildcard configuration when no Angular routes are defined', async () => {
    setAngularAppTestingManifest([], [{ path: '**', renderMode: RenderMode.Server, status: 201 }]);

    const { errors, routeTree } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: false,
      includePrerenderFallbackRoutes: false,
    });

    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Server, status: 201 },
    ]);
  });

  it(`handles a baseHref starting with a "./" path`, async () => {
    setAngularAppTestingManifest(
      [{ path: 'home', component: DummyComponent }],
      [{ path: '**', renderMode: RenderMode.Server }],
      /** baseHref*/ './example',
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: true,
      includePrerenderFallbackRoutes: true,
    });

    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/example/home', renderMode: RenderMode.Server },
    ]);
  });

  it('handles a baseHref starting with a protocol', async () => {
    setAngularAppTestingManifest(
      [{ path: 'home', component: DummyComponent }],
      [{ path: '**', renderMode: RenderMode.Server }],
      /** baseHref*/ 'http://foo.com/example/',
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({
      url,
      invokeGetPrerenderParams: true,
      includePrerenderFallbackRoutes: true,
    });

    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/example/home', renderMode: RenderMode.Server },
    ]);
  });

  it('should not bootstrap the root component', async () => {
    @Component({
      selector: 'app-root',
      template: '',
    })
    class RootComponent {
      constructor() {
        throw new Error('RootComponent should not be bootstrapped.');
      }
    }

    setAngularAppTestingManifest(
      [
        { path: '', component: DummyComponent },
        { path: 'home', component: DummyComponent },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
      undefined,
      undefined,
      undefined,
      RootComponent,
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toHaveSize(2);
  });

  it('should not bootstrap the root component when using `withEnabledBlockingInitialNavigation`', async () => {
    @Component({
      selector: 'app-root',
      template: '',
    })
    class RootComponent {
      constructor() {
        throw new Error('RootComponent should not be bootstrapped.');
      }
    }

    const routes: Routes = [
      { path: '', component: DummyComponent },
      { path: 'home', component: DummyComponent },
    ];

    setAngularAppTestingManifest(
      routes,
      [{ path: '**', renderMode: RenderMode.Server }],
      undefined,
      undefined,
      undefined,
      RootComponent,
      [provideRouter(routes, withEnabledBlockingInitialNavigation())],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toHaveSize(2);
  });

  it('should give precedence to the first matching route over subsequent ones', async () => {
    setAngularAppTestingManifest(
      [
        {
          path: '',
          children: [
            { path: 'home', component: DummyComponent },
            { path: '**', component: DummyComponent },
          ],
        },
        // The following routes should be ignored due to Angular's routing behavior:
        // - ['', '**'] and ['**'] are equivalent, and the first match takes precedence.
        // - ['', 'home'] and ['home'] are equivalent, and the first match takes precedence.
        {
          path: 'home',
          redirectTo: 'never',
        },
        {
          path: '**',
          redirectTo: 'never',
        },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Server },
      { route: '/home', renderMode: RenderMode.Server },
      { route: '/**', renderMode: RenderMode.Server },
    ]);
  });

  it(`should create and run route level injector when 'loadChildren' is used`, async () => {
    const ChildRoutes = new InjectionToken<Route[]>('Child Routes');
    setAngularAppTestingManifest(
      [
        {
          path: '',
          component: DummyComponent,
          providers: [
            {
              provide: ChildRoutes,
              useValue: [
                {
                  path: 'home',
                  component: DummyComponent,
                },
              ],
            },
          ],
          loadChildren: () => inject(ChildRoutes),
        },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
    );

    const { routeTree, errors } = await extractRoutesAndCreateRouteTree({ url });
    expect(errors).toHaveSize(0);
    expect(routeTree.toObject()).toEqual([
      { route: '/', renderMode: RenderMode.Server },
      { route: '/home', renderMode: RenderMode.Server },
    ]);
  });

  it('should provide `IS_DISCOVERING_ROUTES` as `true` during route discovery', async () => {
    let isDiscoveringRoutes: boolean | undefined;

    setAngularAppTestingManifest(
      [
        {
          path: 'lazy',
          loadChildren: () => {
            isDiscoveringRoutes = inject(IS_DISCOVERING_ROUTES);

            return [];
          },
        },
      ],
      [{ path: '**', renderMode: RenderMode.Server }],
    );

    await extractRoutesAndCreateRouteTree({ url });

    expect(isDiscoveringRoutes).toBeTrue();
  });
});
