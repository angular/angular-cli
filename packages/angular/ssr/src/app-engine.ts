/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { AngularServerApp } from './app';
import { Hooks } from './hooks';
import { getPotentialLocaleIdFromUrl } from './i18n';
import { EntryPointExports, getAngularAppEngineManifest } from './manifest';
import { stripIndexHtmlFromURL, stripTrailingSlash } from './utils/url';

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 *
 * @note This class should be instantiated once and used as a singleton across the server-side
 * application to ensure consistent handling of rendering requests and resource management.
 *
 * @developerPreview
 */
export class AngularAppEngine {
  /**
   * Hooks for extending or modifying the behavior of the server application.
   * These hooks are used by the Angular CLI when running the development server and
   * provide extensibility points for the application lifecycle.
   *
   * @private
   */
  static ɵhooks = /* #__PURE__*/ new Hooks();

  /**
   * Provides access to the hooks for extending or modifying the server application's behavior.
   * This allows attaching custom functionality to various server application lifecycle events.
   *
   * @internal
   */
  get hooks(): Hooks {
    return AngularAppEngine.ɵhooks;
  }

  /**
   * The manifest for the server application.
   */
  private readonly manifest = getAngularAppEngineManifest();

  /**
   * A cache that holds entry points, keyed by their potential locale string.
   */
  private readonly entryPointsCache = new Map<string, Promise<EntryPointExports>>();

  /**
   * Handles an incoming HTTP request by serving prerendered content, performing server-side rendering,
   * or delivering a static file for client-side rendered routes based on the `RenderMode` setting.
   *
   * @param request - The HTTP request to handle.
   * @param requestContext - Optional context for rendering, such as metadata associated with the request.
   * @returns A promise that resolves to the resulting HTTP response object, or `null` if no matching Angular route is found.
   *
   * @note A request to `https://www.example.com/page/index.html` will serve or render the Angular route
   * corresponding to `https://www.example.com/page`.
   */
  async handle(request: Request, requestContext?: unknown): Promise<Response | null> {
    const serverApp = await this.getAngularServerAppForRequest(request);

    return serverApp ? serverApp.handle(request, requestContext) : null;
  }

  /**
   * Retrieves the Angular server application instance for a given request.
   *
   * This method checks if the request URL corresponds to an Angular application entry point.
   * If so, it initializes or retrieves an instance of the Angular server application for that entry point.
   * Requests that resemble file requests (except for `/index.html`) are skipped.
   *
   * @param request - The incoming HTTP request object.
   * @returns A promise that resolves to an `AngularServerApp` instance if a valid entry point is found,
   * or `null` if no entry point matches the request URL.
   */
  private async getAngularServerAppForRequest(request: Request): Promise<AngularServerApp | null> {
    // Skip if the request looks like a file but not `/index.html`.
    const url = new URL(request.url);
    const entryPoint = await this.getEntryPointExportsForUrl(url);
    if (!entryPoint) {
      return null;
    }

    const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp } = entryPoint;
    // Note: Using `instanceof` is not feasible here because `AngularServerApp` will
    // be located in separate bundles, making `instanceof` checks unreliable.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const serverApp = getOrCreateAngularServerApp() as AngularServerApp;
    serverApp.hooks = this.hooks;

    return serverApp;
  }

  /**
   * Retrieves the exports for a specific entry point, caching the result.
   *
   * @param potentialLocale - The locale string used to find the corresponding entry point.
   * @returns A promise that resolves to the entry point exports or `undefined` if not found.
   */
  private getEntryPointExports(potentialLocale: string): Promise<EntryPointExports> | undefined {
    const cachedEntryPoint = this.entryPointsCache.get(potentialLocale);
    if (cachedEntryPoint) {
      return cachedEntryPoint;
    }

    const { entryPoints } = this.manifest;
    const entryPoint = entryPoints.get(potentialLocale);
    if (!entryPoint) {
      return undefined;
    }

    const entryPointExports = entryPoint();
    this.entryPointsCache.set(potentialLocale, entryPointExports);

    return entryPointExports;
  }

  /**
   * Retrieves the entry point for a given URL by determining the locale and mapping it to
   * the appropriate application bundle.
   *
   * This method determines the appropriate entry point and locale for rendering the application by examining the URL.
   * If there is only one entry point available, it is returned regardless of the URL.
   * Otherwise, the method extracts a potential locale identifier from the URL and looks up the corresponding entry point.
   *
   * @param url - The URL of the request.
   * @returns A promise that resolves to the entry point exports or `undefined` if not found.
   */
  private getEntryPointExportsForUrl(url: URL): Promise<EntryPointExports> | undefined {
    const { entryPoints, basePath } = this.manifest;
    if (entryPoints.size === 1) {
      return this.getEntryPointExports('');
    }

    const potentialLocale = getPotentialLocaleIdFromUrl(url, basePath);

    return this.getEntryPointExports(potentialLocale);
  }
}
