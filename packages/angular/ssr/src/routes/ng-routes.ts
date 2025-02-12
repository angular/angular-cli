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
  runInInjectionContext,
  ɵConsole,
  ɵENABLE_ROOT_COMPONENT_BOOTSTRAP,
} from '@angular/core';
import { INITIAL_CONFIG, platformServer } from '@angular/platform-server';
import {
  Route as AngularRoute,
  Router,
  ɵloadChildren as loadChildrenHelper,
} from '@angular/router';
import { ServerAssets } from '../assets';
import { Console } from '../console';
import { AngularAppManifest, getAngularAppManifest } from '../manifest';
import { AngularBootstrap, isNgModule } from '../utils/ng';
import { promiseWithAbort } from '../utils/promise';
import { addTrailingSlash, joinUrlParts, stripLeadingSlash } from '../utils/url';
import {
  PrerenderFallback,
  RenderMode,
  SERVER_ROUTES_CONFIG,
  ServerRoute,
  ServerRoutesConfig,
} from './route-config';
import { RouteTree, RouteTreeNodeMetadata } from './route-tree';

interface Route extends AngularRoute {
  ɵentryName?: string;
}

/**
 * The maximum number of module preload link elements that should be added for
 * initial scripts.
 */
const MODULE_PRELOAD_MAX = 10;

/**
 * Regular expression to match segments preceded by a colon in a string.
 */
const URL_PARAMETER_REGEXP = /(?<!\\):([^/]+)/g;

/**
 * An set of HTTP status codes that are considered valid for redirect responses.
 */
const VALID_REDIRECT_RESPONSE_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * Additional metadata for a server configuration route tree.
 */
type ServerConfigRouteTreeAdditionalMetadata = Partial<ServerRoute> & {
  /** Indicates if the route has been matched with the Angular router routes. */
  presentInClientRouter?: boolean;
};

/**
 * Metadata for a server configuration route tree node.
 */
type ServerConfigRouteTreeNodeMetadata = RouteTreeNodeMetadata &
  ServerConfigRouteTreeAdditionalMetadata;

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
   * An array of `RouteTreeNodeMetadata` objects representing the application's routes.
   *
   * Each `RouteTreeNodeMetadata` contains details about a specific route, such as its path and any
   * associated redirection targets. This array is asynchronously generated and
   * provides information on how routes are structured and resolved.
   */
  routes: RouteTreeNodeMetadata[];

  /**
   * Optional configuration for server routes.
   *
   * This property allows you to specify an array of server routes for configuration.
   * If not provided, the default configuration or behavior will be used.
   */
  serverRoutesConfig?: ServerRoute[] | null;

  /**
   * A list of errors encountered during the route extraction process.
   */
  errors: string[];

  /**
   * The specified route for the app-shell, if configured.
   */
  appShellRoute?: string;
}

type EntryPointToBrowserMapping = AngularAppManifest['entryPointToBrowserMapping'];

/**
 * Handles a single route within the route tree and yields metadata or errors.
 *
 * @param options - Configuration options for handling the route.
 * @returns An async iterable iterator yielding `RouteTreeNodeMetadata` or an error object.
 */
async function* handleRoute(options: {
  metadata: ServerConfigRouteTreeNodeMetadata;
  currentRoutePath: string;
  route: Route;
  compiler: Compiler;
  parentInjector: Injector;
  serverConfigRouteTree?: RouteTree<ServerConfigRouteTreeAdditionalMetadata>;
  invokeGetPrerenderParams: boolean;
  includePrerenderFallbackRoutes: boolean;
  entryPointToBrowserMapping?: EntryPointToBrowserMapping;
}): AsyncIterableIterator<RouteTreeNodeMetadata | { error: string }> {
  try {
    const {
      metadata,
      currentRoutePath,
      route,
      compiler,
      parentInjector,
      serverConfigRouteTree,
      entryPointToBrowserMapping,
      invokeGetPrerenderParams,
      includePrerenderFallbackRoutes,
    } = options;

    const { redirectTo, loadChildren, loadComponent, children, ɵentryName } = route;
    if (ɵentryName && loadComponent) {
      appendPreloadToMetadata(ɵentryName, entryPointToBrowserMapping, metadata, true);
    }

    if (metadata.renderMode === RenderMode.Prerender) {
      yield* handleSSGRoute(
        serverConfigRouteTree,
        typeof redirectTo === 'string' ? redirectTo : undefined,
        metadata,
        parentInjector,
        invokeGetPrerenderParams,
        includePrerenderFallbackRoutes,
      );
    } else if (typeof redirectTo === 'string') {
      if (metadata.status && !VALID_REDIRECT_RESPONSE_CODES.has(metadata.status)) {
        yield {
          error:
            `The '${metadata.status}' status code is not a valid redirect response code. ` +
            `Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(', ')}.`,
        };
      } else {
        yield { ...metadata, redirectTo: resolveRedirectTo(metadata.route, redirectTo) };
      }
    } else {
      yield metadata;
    }

    // Recursively process child routes
    if (children?.length) {
      yield* traverseRoutesConfig({
        ...options,
        routes: children,
        parentRoute: currentRoutePath,
        parentPreloads: metadata.preload,
      });
    }

    // Load and process lazy-loaded child routes
    if (loadChildren) {
      if (ɵentryName) {
        // When using `loadChildren`, the entire feature area (including multiple routes) is loaded.
        // As a result, we do not want all dynamic-import dependencies to be preload, because it involves multiple dependencies
        // across different child routes. In contrast, `loadComponent` only loads a single component, which allows
        // for precise control over preloading, ensuring that the files preloaded are exactly those required for that specific route.
        appendPreloadToMetadata(ɵentryName, entryPointToBrowserMapping, metadata, false);
      }

      const loadedChildRoutes = await loadChildrenHelper(
        route,
        compiler,
        parentInjector,
      ).toPromise();

      if (loadedChildRoutes) {
        const { routes: childRoutes, injector = parentInjector } = loadedChildRoutes;
        yield* traverseRoutesConfig({
          ...options,
          routes: childRoutes,
          parentInjector: injector,
          parentRoute: currentRoutePath,
          parentPreloads: metadata.preload,
        });
      }
    }
  } catch (error) {
    yield {
      error: `Error in handleRoute for '${options.currentRoutePath}': ${(error as Error).message}`,
    };
  }
}

/**
 * Traverses an array of route configurations to generate route tree node metadata.
 *
 * This function processes each route and its children, handling redirects, SSG (Static Site Generation) settings,
 * and lazy-loaded routes. It yields route metadata for each route and its potential variants.
 *
 * @param options - The configuration options for traversing routes.
 * @returns An async iterable iterator yielding either route tree node metadata or an error object with an error message.
 */
async function* traverseRoutesConfig(options: {
  routes: Route[];
  compiler: Compiler;
  parentInjector: Injector;
  parentRoute: string;
  serverConfigRouteTree?: RouteTree<ServerConfigRouteTreeAdditionalMetadata>;
  invokeGetPrerenderParams: boolean;
  includePrerenderFallbackRoutes: boolean;
  entryPointToBrowserMapping?: EntryPointToBrowserMapping;
  parentPreloads?: readonly string[];
}): AsyncIterableIterator<RouteTreeNodeMetadata | { error: string }> {
  const { routes: routeConfigs, parentPreloads, parentRoute, serverConfigRouteTree } = options;

  for (const route of routeConfigs) {
    const { matcher, path = matcher ? '**' : '' } = route;
    const currentRoutePath = joinUrlParts(parentRoute, path);

    if (matcher && serverConfigRouteTree) {
      let foundMatch = false;
      for (const matchedMetaData of serverConfigRouteTree.traverse()) {
        if (!matchedMetaData.route.startsWith(currentRoutePath)) {
          continue;
        }

        foundMatch = true;
        matchedMetaData.presentInClientRouter = true;

        if (matchedMetaData.renderMode === RenderMode.Prerender) {
          yield {
            error:
              `The route '${stripLeadingSlash(currentRoutePath)}' is set for prerendering but has a defined matcher. ` +
              `Routes with matchers cannot use prerendering. Please specify a different 'renderMode'.`,
          };
          continue;
        }

        yield* handleRoute({
          ...options,
          currentRoutePath,
          route,
          metadata: {
            ...matchedMetaData,
            preload: parentPreloads,
            route: matchedMetaData.route,
            presentInClientRouter: undefined,
          },
        });
      }

      if (!foundMatch) {
        yield {
          error:
            `The route '${stripLeadingSlash(currentRoutePath)}' has a defined matcher but does not ` +
            'match any route in the server routing configuration. Please ensure this route is added to the server routing configuration.',
        };
      }

      continue;
    }

    let matchedMetaData: ServerConfigRouteTreeNodeMetadata | undefined;
    if (serverConfigRouteTree) {
      matchedMetaData = serverConfigRouteTree.match(currentRoutePath);
      if (!matchedMetaData) {
        yield {
          error:
            `The '${stripLeadingSlash(currentRoutePath)}' route does not match any route defined in the server routing configuration. ` +
            'Please ensure this route is added to the server routing configuration.',
        };
        continue;
      }

      matchedMetaData.presentInClientRouter = true;
    }

    yield* handleRoute({
      ...options,
      metadata: {
        renderMode: RenderMode.Prerender,
        ...matchedMetaData,
        preload: parentPreloads,
        // Match Angular router behavior
        // ['one', 'two', ''] -> 'one/two/'
        // ['one', 'two', 'three'] -> 'one/two/three'
        route: path === '' ? addTrailingSlash(currentRoutePath) : currentRoutePath,
        presentInClientRouter: undefined,
      },
      currentRoutePath,
      route,
    });
  }
}

/**
 * Appends preload information to the metadata object based on the specified entry-point and chunk mappings.
 *
 * This function extracts preload data for a given entry-point from the provided chunk mappings. It adds the
 * corresponding browser bundles to the metadata's preload list, ensuring no duplicates and limiting the total
 * preloads to a predefined maximum.
 */
function appendPreloadToMetadata(
  entryName: string,
  entryPointToBrowserMapping: EntryPointToBrowserMapping,
  metadata: ServerConfigRouteTreeNodeMetadata,
  includeDynamicImports: boolean,
): void {
  const existingPreloads = metadata.preload ?? [];
  if (!entryPointToBrowserMapping || existingPreloads.length >= MODULE_PRELOAD_MAX) {
    return;
  }

  const preload = entryPointToBrowserMapping[entryName];
  if (!preload?.length) {
    return;
  }

  // Merge existing preloads with new ones, ensuring uniqueness and limiting the total to the maximum allowed.
  const combinedPreloads: Set<string> = new Set(existingPreloads);
  for (const { dynamicImport, path } of preload) {
    if (dynamicImport && !includeDynamicImports) {
      continue;
    }

    combinedPreloads.add(path);

    if (combinedPreloads.size === MODULE_PRELOAD_MAX) {
      break;
    }
  }

  metadata.preload = Array.from(combinedPreloads);
}

/**
 * Handles SSG (Static Site Generation) routes by invoking `getPrerenderParams` and yielding
 * all parameterized paths, returning any errors encountered.
 *
 * @param serverConfigRouteTree - The tree representing the server's routing setup.
 * @param redirectTo - Optional path to redirect to, if specified.
 * @param metadata - The metadata associated with the route tree node.
 * @param parentInjector - The dependency injection container for the parent route.
 * @param invokeGetPrerenderParams - A flag indicating whether to invoke the `getPrerenderParams` function.
 * @param includePrerenderFallbackRoutes - A flag indicating whether to include fallback routes in the result.
 * @returns An async iterable iterator that yields route tree node metadata for each SSG path or errors.
 */
async function* handleSSGRoute(
  serverConfigRouteTree: RouteTree<ServerConfigRouteTreeAdditionalMetadata> | undefined,
  redirectTo: string | undefined,
  metadata: ServerConfigRouteTreeNodeMetadata,
  parentInjector: Injector,
  invokeGetPrerenderParams: boolean,
  includePrerenderFallbackRoutes: boolean,
): AsyncIterableIterator<RouteTreeNodeMetadata | { error: string }> {
  if (metadata.renderMode !== RenderMode.Prerender) {
    throw new Error(
      `'handleSSGRoute' was called for a route which rendering mode is not prerender.`,
    );
  }

  const { route: currentRoutePath, fallback, ...meta } = metadata;
  const getPrerenderParams = 'getPrerenderParams' in meta ? meta.getPrerenderParams : undefined;

  if ('getPrerenderParams' in meta) {
    delete meta['getPrerenderParams'];
  }

  if (redirectTo !== undefined) {
    meta.redirectTo = resolveRedirectTo(currentRoutePath, redirectTo);
  }

  if (!URL_PARAMETER_REGEXP.test(currentRoutePath)) {
    // Route has no parameters
    yield {
      ...meta,
      route: currentRoutePath,
    };

    return;
  }

  if (invokeGetPrerenderParams) {
    if (!getPrerenderParams) {
      yield {
        error:
          `The '${stripLeadingSlash(currentRoutePath)}' route uses prerendering and includes parameters, but 'getPrerenderParams' ` +
          `is missing. Please define 'getPrerenderParams' function for this route in your server routing configuration ` +
          `or specify a different 'renderMode'.`,
      };

      return;
    }

    if (serverConfigRouteTree) {
      // Automatically resolve dynamic parameters for nested routes.
      const catchAllRoutePath = joinUrlParts(currentRoutePath, '**');
      const match = serverConfigRouteTree.match(catchAllRoutePath);
      if (match && match.renderMode === RenderMode.Prerender && !('getPrerenderParams' in match)) {
        serverConfigRouteTree.insert(catchAllRoutePath, {
          ...match,
          presentInClientRouter: true,
          getPrerenderParams,
        });
      }
    }

    const parameters = await runInInjectionContext(parentInjector, () => getPrerenderParams());
    try {
      for (const params of parameters) {
        const routeWithResolvedParams = currentRoutePath.replace(URL_PARAMETER_REGEXP, (match) => {
          const parameterName = match.slice(1);
          const value = params[parameterName];
          if (typeof value !== 'string') {
            throw new Error(
              `The 'getPrerenderParams' function defined for the '${stripLeadingSlash(currentRoutePath)}' route ` +
                `returned a non-string value for parameter '${parameterName}'. ` +
                `Please make sure the 'getPrerenderParams' function returns values for all parameters ` +
                'specified in this route.',
            );
          }

          return value;
        });

        yield {
          ...meta,
          route: routeWithResolvedParams,
          redirectTo:
            redirectTo === undefined
              ? undefined
              : resolveRedirectTo(routeWithResolvedParams, redirectTo),
        };
      }
    } catch (error) {
      yield { error: `${(error as Error).message}` };

      return;
    }
  }

  // Handle fallback render modes
  if (
    includePrerenderFallbackRoutes &&
    (fallback !== PrerenderFallback.None || !invokeGetPrerenderParams)
  ) {
    yield {
      ...meta,
      route: currentRoutePath,
      renderMode: fallback === PrerenderFallback.Client ? RenderMode.Client : RenderMode.Server,
    };
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
  const segments = routePath.replace(URL_PARAMETER_REGEXP, '*').split('/');
  segments.pop(); // Remove the last segment to make it relative.

  return joinUrlParts(...segments, redirectTo);
}

/**
 * Builds a server configuration route tree from the given server routes configuration.
 *
 * @param serverRoutesConfig - The server routes to be used for configuration.

 * @returns An object containing:
 * - `serverConfigRouteTree`: A populated `RouteTree` instance, which organizes the server routes
 *   along with their additional metadata.
 * - `errors`: An array of strings that list any errors encountered during the route tree construction
 *   process, such as invalid paths.
 */
function buildServerConfigRouteTree({ routes, appShellRoute }: ServerRoutesConfig): {
  errors: string[];
  serverConfigRouteTree: RouteTree<ServerConfigRouteTreeAdditionalMetadata>;
} {
  const serverRoutes: ServerRoute[] = [...routes];
  if (appShellRoute !== undefined) {
    serverRoutes.unshift({
      path: appShellRoute,
      renderMode: RenderMode.Prerender,
    });
  }

  const serverConfigRouteTree = new RouteTree<ServerConfigRouteTreeAdditionalMetadata>();
  const errors: string[] = [];

  for (const { path, ...metadata } of serverRoutes) {
    if (path[0] === '/') {
      errors.push(`Invalid '${path}' route configuration: the path cannot start with a slash.`);

      continue;
    }

    if (path.includes('*') && 'getPrerenderParams' in metadata) {
      errors.push(
        `Invalid '${path}' route configuration: 'getPrerenderParams' cannot be used with a '*' or '**' route.`,
      );
      continue;
    }

    serverConfigRouteTree.insert(path, metadata);
  }

  return { serverConfigRouteTree, errors };
}

/**
 * Retrieves routes from the given Angular application.
 *
 * This function initializes an Angular platform, bootstraps the application or module,
 * and retrieves routes from the Angular router configuration. It handles both module-based
 * and function-based bootstrapping. It yields the resulting routes as `RouteTreeNodeMetadata` objects or errors.
 *
 * @param bootstrap - A function that returns a promise resolving to an `ApplicationRef` or an Angular module to bootstrap.
 * @param document - The initial HTML document used for server-side rendering.
 * This document is necessary to render the application on the server.
 * @param url - The URL for server-side rendering. The URL is used to configure `ServerPlatformLocation`. This configuration is crucial
 * for ensuring that API requests for relative paths succeed, which is essential for accurate route extraction.
 * @param invokeGetPrerenderParams - A boolean flag indicating whether to invoke `getPrerenderParams` for parameterized SSG routes
 * to handle prerendering paths. Defaults to `false`.
 * @param includePrerenderFallbackRoutes - A flag indicating whether to include fallback routes in the result. Defaults to `true`.
 * @param entryPointToBrowserMapping - Maps the entry-point name to the associated JavaScript browser bundles.
 *
 * @returns A promise that resolves to an object of type `AngularRouterConfigResult` or errors.
 */
export async function getRoutesFromAngularRouterConfig(
  bootstrap: AngularBootstrap,
  document: string,
  url: URL,
  invokeGetPrerenderParams = false,
  includePrerenderFallbackRoutes = true,
  entryPointToBrowserMapping: EntryPointToBrowserMapping | undefined = undefined,
): Promise<AngularRouterConfigResult> {
  const { protocol, host } = url;

  // Create and initialize the Angular platform for server-side rendering.
  const platformRef = platformServer([
    {
      provide: INITIAL_CONFIG,
      useValue: { document, url: `${protocol}//${host}/` },
    },
    {
      // An Angular Console Provider that does not print a set of predefined logs.
      provide: ɵConsole,
      // Using `useClass` would necessitate decorating `Console` with `@Injectable`,
      // which would require switching from `ts_library` to `ng_module`. This change
      // would also necessitate various patches of `@angular/bazel` to support ESM.
      useFactory: () => new Console(),
    },
    {
      provide: ɵENABLE_ROOT_COMPONENT_BOOTSTRAP,
      useValue: false,
    },
  ]);

  try {
    let applicationRef: ApplicationRef;

    if (isNgModule(bootstrap)) {
      const moduleRef = await platformRef.bootstrapModule(bootstrap);
      applicationRef = moduleRef.injector.get(ApplicationRef);
    } else {
      applicationRef = await bootstrap();
    }

    const injector = applicationRef.injector;
    const router = injector.get(Router);

    // Workaround to unblock navigation when `withEnabledBlockingInitialNavigation()` is used.
    // This is necessary because route extraction disables component bootstrapping.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any).navigationTransitions.afterPreactivation()?.next?.();

    // Wait until the application is stable.
    await applicationRef.whenStable();

    const errors: string[] = [];

    const rawBaseHref =
      injector.get(APP_BASE_HREF, null, { optional: true }) ??
      injector.get(PlatformLocation).getBaseHrefFromDOM();
    const { pathname: baseHref } = new URL(rawBaseHref, 'http://localhost');

    const compiler = injector.get(Compiler);
    const serverRoutesConfig = injector.get(SERVER_ROUTES_CONFIG, null, { optional: true });
    let serverConfigRouteTree: RouteTree<ServerConfigRouteTreeAdditionalMetadata> | undefined;

    if (serverRoutesConfig) {
      const result = buildServerConfigRouteTree(serverRoutesConfig);
      serverConfigRouteTree = result.serverConfigRouteTree;
      errors.push(...result.errors);
    }

    if (errors.length) {
      return {
        baseHref,
        routes: [],
        errors,
      };
    }

    const routesResults: RouteTreeNodeMetadata[] = [];
    if (router.config.length) {
      // Retrieve all routes from the Angular router configuration.
      const traverseRoutes = traverseRoutesConfig({
        routes: router.config,
        compiler,
        parentInjector: injector,
        parentRoute: '',
        serverConfigRouteTree,
        invokeGetPrerenderParams,
        includePrerenderFallbackRoutes,
        entryPointToBrowserMapping,
      });

      const seenRoutes: Set<string> = new Set();
      for await (const routeMetadata of traverseRoutes) {
        if ('error' in routeMetadata) {
          errors.push(routeMetadata.error);
          continue;
        }

        // If a result already exists for the exact same route, subsequent matches should be ignored.
        // This aligns with Angular's app router behavior, which prioritizes the first route.
        const routePath = routeMetadata.route;
        if (!seenRoutes.has(routePath)) {
          routesResults.push(routeMetadata);
          seenRoutes.add(routePath);
        }
      }

      // This timeout is necessary to prevent 'adev' from hanging in production builds.
      // The exact cause is unclear, but removing it leads to the issue.
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (serverConfigRouteTree) {
        for (const { route, presentInClientRouter } of serverConfigRouteTree.traverse()) {
          if (presentInClientRouter || route.endsWith('/**')) {
            // Skip if matched or it's the catch-all route.
            continue;
          }

          errors.push(
            `The '${stripLeadingSlash(route)}' server route does not match any routes defined in the Angular ` +
              `routing configuration (typically provided as a part of the 'provideRouter' call). ` +
              'Please make sure that the mentioned server route is present in the Angular routing configuration.',
          );
        }
      }
    } else {
      const rootRouteMetadata = serverConfigRouteTree?.match('') ?? {
        route: '',
        renderMode: RenderMode.Prerender,
      };

      routesResults.push({
        ...rootRouteMetadata,
        // Matched route might be `/*` or `/**`, which would make Angular serve all routes rather than just `/`.
        // So we limit to just `/` for the empty app router case.
        route: '',
      });
    }

    return {
      baseHref,
      routes: routesResults,
      errors,
      appShellRoute: serverRoutesConfig?.appShellRoute,
    };
  } finally {
    platformRef.destroy();
  }
}

/**
 * Asynchronously extracts routes from the Angular application configuration
 * and creates a `RouteTree` to manage server-side routing.
 *
 * @param options - An object containing the following options:
 *  - `url`: The URL for server-side rendering. The URL is used to configure `ServerPlatformLocation`. This configuration is crucial
 *     for ensuring that API requests for relative paths succeed, which is essential for accurate route extraction.
 *     See:
 *      - https://github.com/angular/angular/blob/d608b857c689d17a7ffa33bbb510301014d24a17/packages/platform-server/src/location.ts#L51
 *      - https://github.com/angular/angular/blob/6882cc7d9eed26d3caeedca027452367ba25f2b9/packages/platform-server/src/http.ts#L44
 *  - `manifest`: An optional `AngularAppManifest` that contains the application's routing and configuration details.
 *     If not provided, the default manifest is retrieved using `getAngularAppManifest()`.
 *  - `invokeGetPrerenderParams`: A boolean flag indicating whether to invoke `getPrerenderParams` for parameterized SSG routes
 *     to handle prerendering paths. Defaults to `false`.
 *  - `includePrerenderFallbackRoutes`: A flag indicating whether to include fallback routes in the result. Defaults to `true`.
 *  - `signal`: An optional `AbortSignal` that can be used to abort the operation.
 *
 * @returns A promise that resolves to an object containing:
 *  - `routeTree`: A populated `RouteTree` containing all extracted routes from the Angular application.
 *  - `appShellRoute`: The specified route for the app-shell, if configured.
 *  - `errors`: An array of strings representing any errors encountered during the route extraction process.
 */
export function extractRoutesAndCreateRouteTree(options: {
  url: URL;
  manifest?: AngularAppManifest;
  invokeGetPrerenderParams?: boolean;
  includePrerenderFallbackRoutes?: boolean;
  signal?: AbortSignal;
}): Promise<{ routeTree: RouteTree; appShellRoute?: string; errors: string[] }> {
  const {
    url,
    manifest = getAngularAppManifest(),
    invokeGetPrerenderParams = false,
    includePrerenderFallbackRoutes = true,
    signal,
  } = options;

  async function extract(): Promise<{
    appShellRoute: string | undefined;
    routeTree: RouteTree<{}>;
    errors: string[];
  }> {
    const routeTree = new RouteTree();
    const document = await new ServerAssets(manifest).getIndexServerHtml().text();
    const bootstrap = await manifest.bootstrap();
    const { baseHref, appShellRoute, routes, errors } = await getRoutesFromAngularRouterConfig(
      bootstrap,
      document,
      url,
      invokeGetPrerenderParams,
      includePrerenderFallbackRoutes,
      manifest.entryPointToBrowserMapping,
    );

    for (const { route, ...metadata } of routes) {
      if (metadata.redirectTo !== undefined) {
        metadata.redirectTo = joinUrlParts(baseHref, metadata.redirectTo);
      }

      // Remove undefined fields
      // Helps avoid unnecessary test updates
      for (const [key, value] of Object.entries(metadata)) {
        if (value === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (metadata as any)[key];
        }
      }

      const fullRoute = joinUrlParts(baseHref, route);
      routeTree.insert(fullRoute, metadata);
    }

    return {
      appShellRoute,
      routeTree,
      errors,
    };
  }

  return signal ? promiseWithAbort(extract(), signal, 'Routes extraction') : extract();
}
