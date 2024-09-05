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
import { stripIndexHtmlFromURL } from './utils/url';

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones) and handles rendering requests.

 * @developerPreview
 */
export interface AngularServerAppManager {
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
  render(request: Request, requestContext?: unknown): Promise<Response | null>;

  /**
   * Retrieves HTTP headers for a request associated with statically generated (SSG) pages,
   * based on the URL pathname.
   *
   * @param request - The incoming request object.
   * @returns A `Map` containing the HTTP headers as key-value pairs.
   * @note This function should be used exclusively for retrieving headers of SSG pages.
   */
  getHeaders(request: Request): Readonly<Map<string, string>>;
}

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 *
 * @developerPreview
 */
export class AngularAppEngine implements AngularServerAppManager {
  /**
   * Hooks for extending or modifying the behavior of the server application.
   * These hooks are used by the Angular CLI when running the development server and
   * provide extensibility points for the application lifecycle.
   *
   * @private
   */
  static ɵhooks = new Hooks();

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
    const entryPoint = this.getEntryPointFromUrl(url);
    if (!entryPoint) {
      return null;
    }

    const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp } = await entryPoint();
    // Note: Using `instanceof` is not feasible here because `AngularServerApp` will
    // be located in separate bundles, making `instanceof` checks unreliable.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const serverApp = getOrCreateAngularServerApp() as AngularServerApp;
    serverApp.hooks = this.hooks;

    return serverApp.render(request, requestContext);
  }

  /**
   * Retrieves the entry point path and locale for the Angular server application based on the provided URL.
   *
   * This method determines the appropriate entry point and locale for rendering the application by examining the URL.
   * If there is only one entry point available, it is returned regardless of the URL.
   * Otherwise, the method extracts a potential locale identifier from the URL and looks up the corresponding entry point.
   *
   * @param url - The URL used to derive the locale and determine the appropriate entry point.
   * @returns A function that returns a promise resolving to an object with the `EntryPointExports` type,
   * or `undefined` if no matching entry point is found for the extracted locale.
   */
  private getEntryPointFromUrl(url: URL): (() => Promise<EntryPointExports>) | undefined {
    const { entryPoints, basePath } = this.manifest;
    if (entryPoints.size === 1) {
      return entryPoints.values().next().value;
    }

    const potentialLocale = getPotentialLocaleIdFromUrl(url, basePath);

    return entryPoints.get(potentialLocale);
  }

  /**
   * Retrieves HTTP headers for a request associated with statically generated (SSG) pages,
   * based on the URL pathname.
   *
   * @param request - The incoming request object.
   * @returns A `Map` containing the HTTP headers as key-value pairs.
   * @note This function should be used exclusively for retrieving headers of SSG pages.
   */
  getHeaders(request: Request): Readonly<Map<string, string>> {
    if (this.manifest.staticPathsHeaders.size === 0) {
      return new Map();
    }

    const { pathname } = stripIndexHtmlFromURL(new URL(request.url));
    const headers = this.manifest.staticPathsHeaders.get(pathname);

    return new Map(headers);
  }
}

let angularAppEngine: AngularAppEngine | undefined;

/**
 * Retrieves an existing `AngularAppEngine` instance or creates a new one if none exists.
 *
 * This method ensures that only a single instance of `AngularAppEngine` is created and reused across
 * the application lifecycle, providing efficient resource management. If the instance does not exist,
 * it will be instantiated upon the first call.
 *
 * @developerPreview
 * @returns The existing or newly created instance of `AngularAppEngine`.
 */
export function getOrCreateAngularAppEngine(): AngularServerAppManager {
  return (angularAppEngine ??= new AngularAppEngine());
}

/**
 * Destroys the current `AngularAppEngine` instance, releasing any associated resources.
 *
 * This method resets the reference to the `AngularAppEngine` instance to `undefined`, allowing
 * a new instance to be created on the next call to `getOrCreateAngularAppEngine()`. It is typically
 * used when reinitializing the server environment or refreshing the application state is necessary.
 *
 * @developerPreview
 */
export function destroyAngularAppEngine(): void {
  angularAppEngine = undefined;
}
