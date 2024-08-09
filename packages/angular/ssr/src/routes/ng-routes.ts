/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import {
  ApplicationRef,
  Compiler,
  Injector,
  createPlatformFactory,
  platformCore,
  ɵwhenStable as whenStable,
  ɵConsole,
} from '@angular/core';
import {
  INITIAL_CONFIG,
  ɵINTERNAL_SERVER_PLATFORM_PROVIDERS as INTERNAL_SERVER_PLATFORM_PROVIDERS,
} from '@angular/platform-server';
import { Route, Router, ɵloadChildren as loadChildrenHelper } from '@angular/router';
import { Console } from '../console';
import { AngularAppManifest } from '../manifest';
import { isNgModule } from '../utils/ng';
import { joinUrlParts } from '../utils/url';

/**
 * Represents the result of processing a route.
 */
export interface RouteResult {
  /**
   * The resolved path of the route.
   *
   * This string represents the complete URL path for the route after it has been
   * resolved, including any parent routes or path segments that have been joined.
   */
  route: string;

  /**
   * The target path for route redirection, if applicable.
   *
   * If this route has a `redirectTo` property in the configuration, this field will
   * contain the full resolved URL path that the route should redirect to.
   */
  redirectTo?: string;
}

/**
 * Retrieves routes from the given Angular application.
 *
 * Initializes an Angular platform, bootstraps the application or module,
 * and retrieves routes from the Angular router configuration. Handles both module-based and
 * function-based bootstrapping. Yields the resulting routes as `RouteResult` objects.
 *
 * @param bootstrap - A function that returns a promise resolving to an `ApplicationRef` or an Angular module to bootstrap.
 * @param document - The initial HTML document used for server-side rendering.
 * @param url - The URL for server-side rendering.
 * @returns An async iterator yielding `RouteResult` objects.
 */
export async function* getRoutesFromAngularRouterConfig(
  bootstrap: ReturnType<AngularAppManifest['bootstrap']>,
  document: string,
  url: URL,
): AsyncIterableIterator<RouteResult> {
  const { protocol, host } = url;

  // Create and initialize the Angular platform for server-side rendering.
  const platformRef = createPlatformFactory(platformCore, 'server', [
    {
      provide: INITIAL_CONFIG,
      useValue: { document, url: `${protocol}//${host}/` },
    },
    {
      provide: ɵConsole,
      useFactory: () => new Console(),
    },
    ...INTERNAL_SERVER_PLATFORM_PROVIDERS,
  ])();

  try {
    let applicationRef: ApplicationRef;

    if (isNgModule(bootstrap)) {
      const moduleRef = await platformRef.bootstrapModule(bootstrap);
      applicationRef = moduleRef.injector.get(ApplicationRef);
    } else {
      applicationRef = await bootstrap();
    }

    // Wait until the application is stable.
    await whenStable(applicationRef);

    const injector = applicationRef.injector;
    const router = injector.get(Router);

    const baseHref =
      injector.get(APP_BASE_HREF, null, { optional: true }) ??
      injector.get(PlatformLocation).getBaseHrefFromDOM();

    if (router.config.length === 0) {
      // No routes found in the configuration.
      yield { route: baseHref };
    } else {
      const compiler = injector.get(Compiler);

      // Retrieve all routes from the Angular router configuration.
      yield* traverseRoutesConfig(router.config, compiler, injector, baseHref, baseHref);
    }
  } finally {
    platformRef.destroy();
  }
}

/**
 * Recursively traverses the Angular router configuration to retrieve routes.
 *
 * Iterates through the router configuration, yielding each route along with its potential
 * redirection or error status. Handles nested routes and lazy-loaded child routes.
 *
 * @param routes - The array of route configurations to process.
 * @param compiler - The Angular compiler used to compile route modules.
 * @param parentInjector - The parent injector for lazy-loaded modules.
 * @param parentRoute - The parent route path to prefix child routes.
 * @param baseHref - A string that represents the base URL of the application. This is used to correctly
 *                   resolve relative paths within the route configuration.
 * @returns An async iterator yielding `RouteResult` objects.
 */
async function* traverseRoutesConfig(
  routes: Route[],
  compiler: Compiler,
  parentInjector: Injector,
  parentRoute: string,
  baseHref: string,
): AsyncIterableIterator<RouteResult> {
  for (const route of routes) {
    const { path, redirectTo, loadChildren, children } = route;

    if (path === undefined) {
      // Skip routes without a path.
      continue;
    }

    const currentRoutePath = joinUrlParts(parentRoute, path);
    let normalizedRedirectTo = undefined;

    if (typeof redirectTo === 'string') {
      if (redirectTo[0] === '/') {
        normalizedRedirectTo = joinUrlParts(baseHref, redirectTo);
      } else {
        // Resolve relative redirectTo based on the current route path
        const segments = currentRoutePath.split('/');
        segments.pop(); // Remove the last segment to make it relative
        normalizedRedirectTo = joinUrlParts(...segments, redirectTo);
      }
    }

    yield {
      route: currentRoutePath,
      redirectTo: normalizedRedirectTo,
    };

    if (children?.length) {
      // Recursively process child routes.
      yield* traverseRoutesConfig(children, compiler, parentInjector, currentRoutePath, baseHref);
    }

    if (loadChildren) {
      // Load and process lazy-loaded child routes.
      const loadedChildRoutes = await loadChildrenHelper(
        route,
        compiler,
        parentInjector,
      ).toPromise();

      if (loadedChildRoutes) {
        const { routes: childRoutes, injector = parentInjector } = loadedChildRoutes;
        yield* traverseRoutesConfig(childRoutes, compiler, injector, currentRoutePath, baseHref);
      }
    }
  }
}
