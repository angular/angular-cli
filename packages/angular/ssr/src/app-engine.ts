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
   * Renders a response for the given HTTP request using the server application.
   *
   * This method processes the request, determines the appropriate route and rendering context,
   * and returns an HTTP response.
   *
   * If the request URL appears to be for a file (excluding `/index.html`), the method returns `null`.
   * A request to `https://www.example.com/page/index.html` will render the Angular route
   * corresponding to `https://www.example.com/page`.
   *
   * @param request - The incoming HTTP request object to be rendered.
   * @param requestContext - Optional additional context for the request, such as metadata.
   * @returns A promise that resolves to a Response object, or `null` if the request URL represents a file (e.g., `./logo.png`)
   * rather than an application route.
   */
  async render(request: Request, requestContext?: unknown): Promise<Response | null> {
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

    return serverApp.render(request, requestContext);
  }

  /**
   * Retrieves HTTP headers for a request associated with statically generated (SSG) pages,
   * based on the URL pathname.
   *
   * @param request - The incoming request object.
   * @returns A `Map` containing the HTTP headers as key-value pairs.
   * @note This function should be used exclusively for retrieving headers of SSG pages.
   */
  getPrerenderHeaders(request: Request): ReadonlyMap<string, string> {
    if (this.manifest.staticPathsHeaders.size === 0) {
      return new Map();
    }

    const { pathname } = stripIndexHtmlFromURL(new URL(request.url));
    const headers = this.manifest.staticPathsHeaders.get(stripTrailingSlash(pathname));

    return new Map(headers);
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
