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
  makeEnvironmentProviders,
} from '@angular/core';
import { type DefaultExport, ROUTES, type Route } from '@angular/router';

/**
 * The internal path used for the app shell route.
 * @internal
 */
const APP_SHELL_ROUTE = 'ng-app-shell';

/**
 * Identifies a particular kind of `ServerRoutesFeatureKind`.
 * @see {@link ServerRoutesFeature}
 * @developerPreview
 */
enum ServerRoutesFeatureKind {
  AppShell,
}

/**
 * Helper type to represent a server routes feature.
 * @see {@link ServerRoutesFeatureKind}
 * @developerPreview
 */
interface ServerRoutesFeature<FeatureKind extends ServerRoutesFeatureKind> {
  ɵkind: FeatureKind;
  ɵproviders: Provider[];
}

/**
 * Different rendering modes for server routes.
 * @see {@link provideServerRouting}
 * @see {@link ServerRoute}
 * @developerPreview
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
 * @developerPreview
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
 * @developerPreview
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
 * @developerPreview
 */
export interface ServerRouteClient extends ServerRouteCommon {
  /** Specifies that the route uses Client-Side Rendering (CSR) mode. */
  renderMode: RenderMode.Client;
}

/**
 * A server route that uses Static Site Generation (SSG) mode.
 * @see {@link RenderMode}
 * @developerPreview
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
 * @developerPreview
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
   * It also works for catch-all routes (e.g., `/**`), where the parameter name will be `**` and the return value will be
   * the segments of the path, such as `/foo/bar`. These routes can also be combined, e.g., `/product/:id/**`,
   * where both a parameterized segment (`:id`) and a catch-all segment (`**`) can be used together to handle more complex paths.
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
   *       return ids.map(id => ({ id })); // Generates paths like: ['product/1', 'product/2', 'product/3']
   *     },
   *   },
   *   {
   *     path: '/product/:id/**',
   *     renderMode: RenderMode.Prerender,
   *     async getPrerenderParams() {
   *       return [
   *         { id: '1', '**': 'laptop/3' },
   *         { id: '2', '**': 'laptop/4' }
   *       ]; // Generates paths like: ['product/1/laptop/3', 'product/2/laptop/4']
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
 * @developerPreview
 */
export interface ServerRouteServer extends ServerRouteCommon {
  /** Specifies that the route uses Server-Side Rendering (SSR) mode. */
  renderMode: RenderMode.Server;
}

/**
 * Server route configuration.
 * @see {@link provideServerRouting}
 * @developerPreview
 */
export type ServerRoute =
  | ServerRouteClient
  | ServerRoutePrerender
  | ServerRoutePrerenderWithParams
  | ServerRouteServer;

/**
 * Configuration options for server routes.
 *
 * This interface defines the optional settings available for configuring server routes
 * in the server-side environment, such as specifying a path to the app shell route.
 *
 *
 * @see {@link provideServerRouting}
 * @deprecated use `provideServerRouting`. This will be removed in version 20.
 */

export interface ServerRoutesConfigOptions {
  /**
   * Defines the route to be used as the app shell, which serves as the main entry
   * point for the application. This route is often used to enable server-side rendering
   * of the application shell for requests that do not match any specific server route.
   */
  appShellRoute?: string;
}

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
 * Sets up the necessary providers for configuring server routes.
 * This function accepts an array of server routes and optional configuration
 * options, returning an `EnvironmentProviders` object that encapsulates
 * the server routes and configuration settings.
 *
 * @param routes - An array of server routes to be provided.
 * @param options - (Optional) An object containing additional configuration options for server routes.
 * @returns An `EnvironmentProviders` instance with the server routes configuration.
 *
 * @see {@link ServerRoute}
 * @see {@link ServerRoutesConfigOptions}
 * @see {@link provideServerRouting}
 * @deprecated use `provideServerRouting`. This will be removed in version 20.
 * @developerPreview
 */
export function provideServerRoutesConfig(
  routes: ServerRoute[],
  options?: ServerRoutesConfigOptions,
): EnvironmentProviders {
  if (typeof ngServerMode === 'undefined' || !ngServerMode) {
    throw new Error(
      `The 'provideServerRoutesConfig' function should not be invoked within the browser portion of the application.`,
    );
  }

  return makeEnvironmentProviders([
    {
      provide: SERVER_ROUTES_CONFIG,
      useValue: { routes, ...options },
    },
  ]);
}

/**
 * Sets up the necessary providers for configuring server routes.
 * This function accepts an array of server routes and optional configuration
 * options, returning an `EnvironmentProviders` object that encapsulates
 * the server routes and configuration settings.
 *
 * @param routes - An array of server routes to be provided.
 * @param features - (Optional) server routes features.
 * @returns An `EnvironmentProviders` instance with the server routes configuration.
 *
 * @see {@link ServerRoute}
 * @see {@link withAppShell}
 * @developerPreview
 */
export function provideServerRouting(
  routes: ServerRoute[],
  ...features: ServerRoutesFeature<ServerRoutesFeatureKind>[]
): EnvironmentProviders {
  const config: ServerRoutesConfig = { routes };
  const hasAppShell = features.some((f) => f.ɵkind === ServerRoutesFeatureKind.AppShell);
  if (hasAppShell) {
    config.appShellRoute = APP_SHELL_ROUTE;
  }

  const providers: Provider[] = [
    {
      provide: SERVER_ROUTES_CONFIG,
      useValue: config,
    },
  ];

  for (const feature of features) {
    providers.push(...feature.ɵproviders);
  }

  return makeEnvironmentProviders(providers);
}

/**
 * Configures the app shell route with the provided component.
 *
 * The app shell serves as the main entry point for the application and is commonly used
 * to enable server-side rendering (SSR) of the application shell. It handles requests
 * that do not match any specific server route, providing a fallback mechanism and improving
 * perceived performance during navigation.
 *
 * This configuration is particularly useful in applications leveraging Progressive Web App (PWA)
 * patterns, such as service workers, to deliver a seamless user experience.
 *
 * @param component The Angular component to render for the app shell route.
 * @returns A server routes feature configuration for the app shell.
 *
 * @see {@link provideServerRouting}
 * @see {@link https://angular.dev/ecosystem/service-workers/app-shell | App shell pattern on Angular.dev}
 */
export function withAppShell(
  component: Type<unknown> | (() => Promise<Type<unknown> | DefaultExport<Type<unknown>>>),
): ServerRoutesFeature<ServerRoutesFeatureKind.AppShell> {
  const routeConfig: Route = {
    path: APP_SHELL_ROUTE,
  };

  if ('ɵcmp' in component) {
    routeConfig.component = component as Type<unknown>;
  } else {
    routeConfig.loadComponent = component as () => Promise<Type<unknown>>;
  }

  return {
    ɵkind: ServerRoutesFeatureKind.AppShell,
    ɵproviders: [
      {
        provide: ROUTES,
        useValue: routeConfig,
        multi: true,
      },
    ],
  };
}
