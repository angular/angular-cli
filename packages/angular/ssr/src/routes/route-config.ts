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
 * @developerPreview
 */
export enum RenderMode {
  /** AppShell rendering mode, typically used for pre-rendered shells of the application. */
  AppShell,

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
 *
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
 * A server route that uses AppShell rendering mode.
 */
export interface ServerRouteAppShell extends Omit<ServerRouteCommon, 'headers' | 'status'> {
  /** Specifies that the route uses AppShell rendering mode. */
  renderMode: RenderMode.AppShell;
}

/**
 * A server route that uses Client-Side Rendering (CSR) mode.
 */
export interface ServerRouteClient extends ServerRouteCommon {
  /** Specifies that the route uses Client-Side Rendering (CSR) mode. */
  renderMode: RenderMode.Client;
}

/**
 * A server route that uses Static Site Generation (SSG) mode.
 */
export interface ServerRoutePrerender extends Omit<ServerRouteCommon, 'status'> {
  /** Specifies that the route uses Static Site Generation (SSG) mode. */
  renderMode: RenderMode.Prerender;

  /** Fallback cannot be specified unless `getPrerenderParams` is used. */
  fallback?: never;
}

/**
 * A server route configuration that uses Static Site Generation (SSG) mode, including support for routes with parameters.
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
 */
export interface ServerRouteServer extends ServerRouteCommon {
  /** Specifies that the route uses Server-Side Rendering (SSR) mode. */
  renderMode: RenderMode.Server;
}

/**
 * Server route configuration.
 * @developerPreview
 */
export type ServerRoute =
  | ServerRouteAppShell
  | ServerRouteClient
  | ServerRoutePrerender
  | ServerRoutePrerenderWithParams
  | ServerRouteServer;

/**
 * Token for providing the server routes configuration.
 * @internal
 */
export const SERVER_ROUTES_CONFIG = new InjectionToken<ServerRoute[]>('SERVER_ROUTES_CONFIG');

/**
 * Configures the necessary providers for server routes configuration.
 *
 * @param routes - An array of server routes to be provided.
 * @returns An `EnvironmentProviders` object that contains the server routes configuration.
 * @developerPreview
 */
export function provideServerRoutesConfig(routes: ServerRoute[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SERVER_ROUTES_CONFIG,
      useValue: routes,
    },
  ]);
}
