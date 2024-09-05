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
  SSR,

  /** Client-Side Rendering (CSR) mode, where content is rendered on the client side in the browser. */
  CSR,

  /** Static Site Generation (SSG) mode, where content is pre-rendered at build time and served as static files. */
  SSG,
}

/**
 * Fallback strategies for Static Site Generation (SSG) routes.
 * @developerPreview
 */
export enum SSGFallback {
  /** Use Server-Side Rendering (SSR) as the fallback for this route. */
  SSR,

  /** Use Client-Side Rendering (CSR) as the fallback for this route. */
  CSR,

  /** No fallback; Angular will not handle the response if the path is not pre-rendered. */
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
export interface ServerRouteCSR extends ServerRouteCommon {
  /** Specifies that the route uses Client-Side Rendering (CSR) mode. */
  renderMode: RenderMode.CSR;
}

/**
 * A server route that uses Static Site Generation (SSG) mode.
 */
export interface ServerRouteSSG extends Omit<ServerRouteCommon, 'status'> {
  /** Specifies that the route uses Static Site Generation (SSG) mode. */
  renderMode: RenderMode.SSG;

  /**
   * Optional fallback strategy to use if the SSG path is not pre-rendered.
   * Defaults to `SSGFallback.SSR` if not provided.
   */
  fallback?: SSGFallback;
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
   *     remderMode: RenderMode.SSG,
   *     async getPrerenderPaths() {
   *       const productService = inject(ProductService);
   *       const ids = await productService.getIds(); // Assuming this returns ['1', '2', '3']
   *
   *       return ids.map(id => ({ id })); // Generates paths like: [{ id: '1' }, { id: '2' }, { id: '3' }]
   *     },
   *   },
   * ];
   * ```
   */
  getPrerenderPaths?: () => Promise<Record<string, string>[]>;
}

/**
 * A server route that uses Server-Side Rendering (SSR) mode.
 */
export interface ServerRouteSSR extends ServerRouteCommon {
  /** Specifies that the route uses Server-Side Rendering (SSR) mode. */
  renderMode: RenderMode.SSR;
}

/**
 * Server route configuration.
 * @developerPreview
 */
export type ServerRoute = ServerRouteAppShell | ServerRouteCSR | ServerRouteSSG | ServerRouteSSR;

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
