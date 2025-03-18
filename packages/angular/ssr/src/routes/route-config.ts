/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  Type,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideServerRendering as provideServerRenderingPlatformServer } from '@angular/platform-server';
import { type DefaultExport, ROUTES, type Route } from '@angular/router';

/**
 * The internal path used for the app shell route.
 * @internal
 */
const APP_SHELL_ROUTE = 'ng-app-shell';

/**
 * Identifies a particular kind of `ServerRenderingFeatureKind`.
 * @see {@link ServerRenderingFeature}
 */
enum ServerRenderingFeatureKind {
  AppShell,
  ServerRoutes,
}

/**
 * Helper type to represent a server routes feature.
 * @see {@link ServerRenderingFeatureKind}
 */
interface ServerRenderingFeature<FeatureKind extends ServerRenderingFeatureKind> {
  ɵkind: FeatureKind;
  ɵproviders: (Provider | EnvironmentProviders)[];
}

/**
 * Different rendering modes for server routes.
 * @see {@link withRoutes}
 * @see {@link ServerRoute}
 */
export enum RenderMode {
  /** Server-Side Rendering (SSR) mode, where content is rendered on the server for each request. */
  Server,

  /** Client-Side Rendering (CSR) mode, where content is rendered on the client side in the browser. */
  Client,

  /** Static Site Generation (SSG) mode, where content is pre-rendered at build time and served as static files. */
  Prerender,
}

/**
 * Defines the fallback strategies for Static Site Generation (SSG) routes when a pre-rendered path is not available.
 * This is particularly relevant for routes with parameterized URLs where some paths might not be pre-rendered at build time.
 * @see {@link ServerRoutePrerenderWithParams}
 */
export enum PrerenderFallback {
  /**
   * Fallback to Server-Side Rendering (SSR) if the pre-rendered path is not available.
   * This strategy dynamically generates the page on the server at request time.
   */
  Server,

  /**
   * Fallback to Client-Side Rendering (CSR) if the pre-rendered path is not available.
   * This strategy allows the page to be rendered on the client side.
   */
  Client,

  /**
   * No fallback; if the path is not pre-rendered, the server will not handle the request.
   * This means the application will not provide any response for paths that are not pre-rendered.
   */
  None,
}

/**
 * Common interface for server routes, providing shared properties.
 */
export interface ServerRouteCommon {
  /** The path associated with this route. */
  path: string;

  /** Optional additional headers to include in the response for this route. */
  headers?: Record<string, string>;

  /** Optional status code to return for this route. */
  status?: number;
}

/**
 * A server route that uses Client-Side Rendering (CSR) mode.
 * @see {@link RenderMode}
 */
export interface ServerRouteClient extends ServerRouteCommon {
  /** Specifies that the route uses Client-Side Rendering (CSR) mode. */
  renderMode: RenderMode.Client;
}

/**
 * A server route that uses Static Site Generation (SSG) mode.
 * @see {@link RenderMode}
 */
export interface ServerRoutePrerender extends Omit<ServerRouteCommon, 'status'> {
  /** Specifies that the route uses Static Site Generation (SSG) mode. */
  renderMode: RenderMode.Prerender;

  /** Fallback cannot be specified unless `getPrerenderParams` is used. */
  fallback?: never;
}

/**
 * A server route configuration that uses Static Site Generation (SSG) mode, including support for routes with parameters.
 * @see {@link RenderMode}
 * @see {@link ServerRoutePrerender}
 * @see {@link PrerenderFallback}
 */
export interface ServerRoutePrerenderWithParams extends Omit<ServerRoutePrerender, 'fallback'> {
  /**
   * Optional strategy to use if the SSG path is not pre-rendered.
   * This is especially relevant for routes with parameterized URLs, where some paths may not be pre-rendered at build time.
   *
   * This property determines how to handle requests for paths that are not pre-rendered:
   * - `PrerenderFallback.Server`: Use Server-Side Rendering (SSR) to dynamically generate the page at request time.
   * - `PrerenderFallback.Client`: Use Client-Side Rendering (CSR) to fetch and render the page on the client side.
   * - `PrerenderFallback.None`: No fallback; if the path is not pre-rendered, the server will not handle the request.
   *
   * @default `PrerenderFallback.Server` if not provided.
   */
  fallback?: PrerenderFallback;

  /**
   * A function that returns a Promise resolving to an array of objects, each representing a route path with URL parameters.
   * This function runs in the injector context, allowing access to Angular services and dependencies.
   *
   * @returns A Promise resolving to an array where each element is an object with string keys (representing URL parameter names)
   * and string values (representing the corresponding values for those parameters in the route path).
   *
   * @example
   * ```typescript
   * export const serverRouteConfig: ServerRoutes[] = [
   *   {
   *     path: '/product/:id',
   *     renderMode: RenderMode.Prerender,
   *     async getPrerenderParams() {
   *       const productService = inject(ProductService);
   *       const ids = await productService.getIds(); // Assuming this returns ['1', '2', '3']
   *
   *       return ids.map(id => ({ id })); // Generates paths like: [{ id: '1' }, { id: '2' }, { id: '3' }]
   *     },
   *   },
   * ];
   * ```
   */
  getPrerenderParams: () => Promise<Record<string, string>[]>;
}

/**
 * A server route that uses Server-Side Rendering (SSR) mode.
 * @see {@link RenderMode}
 */
export interface ServerRouteServer extends ServerRouteCommon {
  /** Specifies that the route uses Server-Side Rendering (SSR) mode. */
  renderMode: RenderMode.Server;
}

/**
 * Server route configuration.
 * @see {@link withRoutes}
 */
export type ServerRoute =
  | ServerRouteClient
  | ServerRoutePrerender
  | ServerRoutePrerenderWithParams
  | ServerRouteServer;

/**
 * Configuration value for server routes configuration.
 * @internal
 */
export interface ServerRoutesConfig {
  /**
   * Defines the route to be used as the app shell.
   */
  appShellRoute?: string;

  /** List of server routes for the application. */
  routes: ServerRoute[];
}

/**
 * Token for providing the server routes configuration.
 * @internal
 */
export const SERVER_ROUTES_CONFIG = new InjectionToken<ServerRoutesConfig>('SERVER_ROUTES_CONFIG');

/**
 * Configures server-side routing for the application.
 *
 * This function registers an array of `ServerRoute` definitions, enabling server-side rendering
 * for specific URL paths. These routes are used to pre-render content on the server, improving
 * initial load performance and SEO.
 *
 * @param routes - An array of `ServerRoute` objects, each defining a server-rendered route.
 * @returns A `ServerRenderingFeature` object configuring server-side routes.
 *
 * @example
 * ```ts
 * import { provideServerRendering, withRoutes, ServerRoute, RenderMode } from '@angular/ssr';
 *
 * const serverRoutes: ServerRoute[] = [
 *   {
 *     route: '', // This renders the "/" route on the client (CSR)
 *     renderMode: RenderMode.Client,
 *   },
 *   {
 *     route: 'about', // This page is static, so we prerender it (SSG)
 *     renderMode: RenderMode.Prerender,
 *   },
 *   {
 *     route: 'profile', // This page requires user-specific data, so we use SSR
 *     renderMode: RenderMode.Server,
 *   },
 *   {
 *     route: '**', // All other routes will be rendered on the server (SSR)
 *     renderMode: RenderMode.Server,
 *   },
 * ];
 *
 * provideServerRendering(withRoutes(serverRoutes));
 * ```
 *
 * @see {@link provideServerRendering}
 * @see {@link ServerRoute}
 */
export function withRoutes(
  routes: ServerRoute[],
): ServerRenderingFeature<ServerRenderingFeatureKind.ServerRoutes> {
  const config: ServerRoutesConfig = { routes };

  return {
    ɵkind: ServerRenderingFeatureKind.ServerRoutes,
    ɵproviders: [
      {
        provide: SERVER_ROUTES_CONFIG,
        useValue: config,
      },
    ],
  };
}

/**
 * Configures the shell of the application.
 *
 * The app shell is a minimal, static HTML page that is served immediately, while the
 * full Angular application loads in the background. This improves perceived performance
 * by providing instant feedback to the user.
 *
 * This function configures the app shell route, which serves the provided component for
 * requests that do not match any defined server routes.
 *
 * @param component - The Angular component to render for the app shell. Can be a direct
 * component type or a dynamic import function.
 * @returns A `ServerRenderingFeature` object configuring the app shell.
 *
 * @example
 * ```ts
 * import { provideServerRendering, withAppShell, withRoutes } from '@angular/ssr';
 * import { AppShellComponent } from './app-shell.component';
 *
 * provideServerRendering(
 *   withRoutes(serverRoutes),
 *   withAppShell(AppShellComponent)
 * );
 * ```
 *
 * @example
 * ```ts
 * import { provideServerRendering, withAppShell, withRoutes } from '@angular/ssr';
 *
 * provideServerRendering(
 *   withRoutes(serverRoutes),
 *   withAppShell(() =>
 *     import('./app-shell.component').then((m) => m.AppShellComponent)
 *   )
 * );
 * ```
 *
 * @see {@link provideServerRendering}
 * @see {@link https://angular.dev/ecosystem/service-workers/app-shell | App shell pattern on Angular.dev}
 */
export function withAppShell(
  component: Type<unknown> | (() => Promise<Type<unknown> | DefaultExport<Type<unknown>>>),
): ServerRenderingFeature<ServerRenderingFeatureKind.AppShell> {
  const routeConfig: Route = {
    path: APP_SHELL_ROUTE,
  };

  if ('ɵcmp' in component) {
    routeConfig.component = component as Type<unknown>;
  } else {
    routeConfig.loadComponent = component as () => Promise<Type<unknown>>;
  }

  return {
    ɵkind: ServerRenderingFeatureKind.AppShell,
    ɵproviders: [
      {
        provide: ROUTES,
        useValue: routeConfig,
        multi: true,
      },
      provideEnvironmentInitializer(() => {
        const config = inject(SERVER_ROUTES_CONFIG);
        config.appShellRoute = APP_SHELL_ROUTE;
      }),
    ],
  };
}

/**
 * Configures server-side rendering for an Angular application.
 *
 * This function sets up the necessary providers for server-side rendering, including
 * support for server routes and app shell. It combines features configured using
 * `withRoutes` and `withAppShell` to provide a comprehensive server-side rendering setup.
 *
 * @param features - Optional features to configure additional server rendering behaviors.
 * @returns An `EnvironmentProviders` instance with the server-side rendering configuration.
 *
 * @example
 * Basic example of how you can enable server-side rendering in your application
 * when using the `bootstrapApplication` function:
 *
 * ```ts
 * import { bootstrapApplication } from '@angular/platform-browser';
 * import { provideServerRendering, withRoutes, withAppShell } from '@angular/ssr';
 * import { AppComponent } from './app/app.component';
 * import { SERVER_ROUTES } from './app/app.server.routes';
 * import { AppShellComponent } from './app/app-shell.component';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *      provideServerRendering(
 *         withRoutes(SERVER_ROUTES),
 *         withAppShell(AppShellComponent)
 *      )
 *   ]
 * });
 * ```
 * @see {@link withRoutes} configures server-side routing
 * @see {@link withAppShell} configures the application shell
 */
export function provideServerRendering(
  ...features: ServerRenderingFeature<ServerRenderingFeatureKind>[]
): EnvironmentProviders {
  let hasAppShell = false;
  let hasServerRoutes = false;
  const providers: (Provider | EnvironmentProviders)[] = [provideServerRenderingPlatformServer()];

  for (const { ɵkind, ɵproviders } of features) {
    hasAppShell ||= ɵkind === ServerRenderingFeatureKind.AppShell;
    hasServerRoutes ||= ɵkind === ServerRenderingFeatureKind.ServerRoutes;
    providers.push(...ɵproviders);
  }

  if (!hasServerRoutes && hasAppShell) {
    throw new Error(
      `Configuration error: found 'withAppShell()' without 'withRoutes()' in the same call to 'provideServerRendering()'.` +
        `The 'withAppShell()' function requires 'withRoutes()' to be used.`,
    );
  }

  return makeEnvironmentProviders(providers);
}
