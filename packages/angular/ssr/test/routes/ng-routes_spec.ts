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
import { Routes, provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { extractRoutesAndCreateRouteTree } from '../../src/routes/ng-routes';
import { PrerenderFallback, RenderMode } from '../../src/routes/route-config';
import { setAngularAppTestingManifest } from '../testing-utils';

describe('extractRoutesAndCreateRouteTree', () => {
  const url = new URL('http://localhost');

  @Component({
    standalone: true,
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

    it("should error when 'getPrerenderParams' is used with a '**' route", async () => {
      setAngularAppTestingManifest(
        [{ path: 'home', component: DummyComponent }],
        [
          {
            path: '**',
            renderMode: RenderMode.Prerender,
            getPrerenderParams() {
              return Promise.resolve([]);
            },
          },
        ],
      );

      const { errors } = await extractRoutesAndCreateRouteTree({ url });
      expect(errors[0]).toContain(
        "Invalid '**' route configuration: 'getPrerenderParams' cannot be used with a '*' or '**' route.",
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
        "Invalid 'invalid/*' route configuration: 'getPrerenderParams' cannot be used with a '*' or '**' route.",
      );
    });

    it(`should not error when a catch-all route didn't match any Angular route.`, async () => {
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

    it('should resolve parameterized routes for SSG and not add a fallback route if fallback is None', async () => {
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
      standalone: true,
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
      standalone: true,
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
});
