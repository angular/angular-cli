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
  ɵresetCompiledComponents,
} from '@angular/core';
import {
  INITIAL_CONFIG,
  ɵINTERNAL_SERVER_PLATFORM_PROVIDERS as INTERNAL_SERVER_PLATFORM_PROVIDERS,
} from '@angular/platform-server';
import { Route, Router, ɵloadChildren as loadChildrenHelper } from '@angular/router';
import { Console } from '../console';
import { AngularBootstrap, isNgModule } from '../utils/ng';
import { joinUrlParts } from '../utils/url';

/**
 * Result of extracting routes from an Angular application.
 */
interface AngularRouterConfigResult {
  /**
   * The base URL for the application.
   * This is the base href that is used for resolving relative paths within the application.
   */
  baseHref: string;

  /**
   * An array of `RouteResult` objects representing the application's routes.
   *
   * Each `RouteResult` contains details about a specific route, such as its path and any
   * associated redirection targets. This array is asynchronously generated and
   * provides information on how routes are structured and resolved.
   *
   * Example:
   * ```typescript
   * const result: AngularRouterConfigResult = {
   *   baseHref: '/app/',
   *   routes: [
   *     { route: '/home', redirectTo: '/welcome' },
   *     { route: '/about' },
   *   ],
   * };
   * ```
   */
  routes: RouteResult[];
}

/**
 * Represents the result of processing a route.
 */
interface RouteResult {
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
 * Recursively traverses the Angular router configuration to retrieve routes.
 *
 * Iterates through the router configuration, yielding each route along with its potential
 * redirection or error status. Handles nested routes and lazy-loaded child routes.
 *
 * @param options - An object containing the parameters for traversing routes.
 * @returns An async iterator yielding `RouteResult` objects.
 */
async function* traverseRoutesConfig(options: {
  /** The array of route configurations to process. */
  routes: Route[];
  /** The Angular compiler used to compile route modules. */
  compiler: Compiler;
  /** The parent injector for lazy-loaded modules. */
  parentInjector: Injector;
  /** The parent route path to prefix child routes. */
  parentRoute: string;
}): AsyncIterableIterator<RouteResult> {
  const { routes, compiler, parentInjector, parentRoute } = options;

  for (const route of routes) {
    const { path = '', redirectTo, loadChildren, children } = route;
    const currentRoutePath = joinUrlParts(parentRoute, path);

    yield {
      route: currentRoutePath,
      redirectTo:
        typeof redirectTo === 'string'
          ? resolveRedirectTo(currentRoutePath, redirectTo)
          : undefined,
    };

    if (children?.length) {
      // Recursively process child routes.
      yield* traverseRoutesConfig({
        routes: children,
        compiler,
        parentInjector,
        parentRoute: currentRoutePath,
      });
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
        yield* traverseRoutesConfig({
          routes: childRoutes,
          compiler,
          parentInjector: injector,
          parentRoute: currentRoutePath,
        });
      }
    }
  }
}

/**
 * Resolves the `redirectTo` property for a given route.
 *
 * This function processes the `redirectTo` property to ensure that it correctly
 * resolves relative to the current route path. If `redirectTo` is an absolute path,
 * it is returned as is. If it is a relative path, it is resolved based on the current route path.
 *
 * @param routePath - The current route path.
 * @param redirectTo - The target path for redirection.
 * @returns The resolved redirect path as a string.
 */
function resolveRedirectTo(routePath: string, redirectTo: string): string {
  if (redirectTo[0] === '/') {
    // If the redirectTo path is absolute, return it as is.
    return redirectTo;
  }

  // Resolve relative redirectTo based on the current route path.
  const segments = routePath.split('/');
  segments.pop(); // Remove the last segment to make it relative.

  return joinUrlParts(...segments, redirectTo);
}

/**
 * Retrieves routes from the given Angular application.
 *
 * This function initializes an Angular platform, bootstraps the application or module,
 * and retrieves routes from the Angular router configuration. It handles both module-based
 * and function-based bootstrapping. It yields the resulting routes as `RouteResult` objects.
 *
 * @param bootstrap - A function that returns a promise resolving to an `ApplicationRef` or an Angular module to bootstrap.
 * @param document - The initial HTML document used for server-side rendering.
 * This document is necessary to render the application on the server.
 * @param url - The URL for server-side rendering. The URL is used to configure `ServerPlatformLocation`. This configuration is crucial
 * for ensuring that API requests for relative paths succeed, which is essential for accurate route extraction.
 * See:
 *  - https://github.com/angular/angular/blob/d608b857c689d17a7ffa33bbb510301014d24a17/packages/platform-server/src/location.ts#L51
 *  - https://github.com/angular/angular/blob/6882cc7d9eed26d3caeedca027452367ba25f2b9/packages/platform-server/src/http.ts#L44
 * @returns A promise that resolves to an object of type `AngularRouterConfigResult`.
 */
export async function getRoutesFromAngularRouterConfig(
  bootstrap: AngularBootstrap,
  document: string,
  url: URL,
): Promise<AngularRouterConfigResult> {
  // Need to clean up GENERATED_COMP_IDS map in `@angular/core`.
  // Otherwise an incorrect component ID generation collision detected warning will be displayed in development.
  // See: https://github.com/angular/angular-cli/issues/25924
  ɵresetCompiledComponents();

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
    const routesResults: RouteResult[] = [];

    if (router.config.length) {
      const compiler = injector.get(Compiler);

      // Retrieve all routes from the Angular router configuration.
      const traverseRoutes = traverseRoutesConfig({
        routes: router.config,
        compiler,
        parentInjector: injector,
        parentRoute: '',
      });

      for await (const result of traverseRoutes) {
        routesResults.push(result);
      }
    } else {
      routesResults.push({ route: '' });
    }

    const baseHref =
      injector.get(APP_BASE_HREF, null, { optional: true }) ??
      injector.get(PlatformLocation).getBaseHrefFromDOM();

    return {
      baseHref,
      routes: routesResults,
    };
  } finally {
    platformRef.destroy();
  }
}
