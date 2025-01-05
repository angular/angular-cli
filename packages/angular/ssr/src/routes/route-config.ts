/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Different rendering modes for server routes.
 * @see {@link provideServerRoutesConfig}
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
 * @developerPreview
 */
export interface ServerRouteServer extends ServerRouteCommon {
  /** Specifies that the route uses Server-Side Rendering (SSR) mode. */
  renderMode: RenderMode.Server;
}

/**
 * Server route configuration.
 * @see {@link provideServerRoutesConfig}
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
 * @see {@link provideServerRoutesConfig}
 * @developerPreview
 */

export interface ServerRoutesConfigOptions {
  /**
   * Defines the route to be used as the app shell, which serves as the main entry
   * point for the application. This route is often used to enable server-side rendering
   * of the application shell for requests that do not match any specific server route.
   *
   * @see {@link https://angular.dev/ecosystem/service-workers/app-shell | App shell pattern on Angular.dev}
   */
  appShellRoute?: string;
}

/**
 * Configuration value for server routes configuration.
 * @internal
 */
export interface ServerRoutesConfig extends ServerRoutesConfigOptions {
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
