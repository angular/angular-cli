/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  LOCALE_ID,
  REQUEST,
  REQUEST_CONTEXT,
  RESPONSE_INIT,
  StaticProvider,
  ɵresetCompiledComponents,
} from '@angular/core';
import { ServerAssets } from './assets';
import { Hooks } from './hooks';
import { getAngularAppManifest } from './manifest';
import { RenderMode } from './routes/route-config';
import { RouteTreeNodeMetadata } from './routes/route-tree';
import { ServerRouter } from './routes/router';
import { sha256 } from './utils/crypto';
import { InlineCriticalCssProcessor } from './utils/inline-critical-css';
import { LRUCache } from './utils/lru-cache';
import { AngularBootstrap, renderAngular } from './utils/ng';
import { promiseWithAbort } from './utils/promise';
import { buildPathWithParams, joinUrlParts, stripLeadingSlash } from './utils/url';

/**
 * Maximum number of critical CSS entries the cache can store.
 * This value determines the capacity of the LRU (Least Recently Used) cache, which stores critical CSS for pages.
 */
const MAX_INLINE_CSS_CACHE_ENTRIES = 50;

/**
 * A mapping of `RenderMode` enum values to corresponding string representations.
 *
 * This record is used to map each `RenderMode` to a specific string value that represents
 * the server context. The string values are used internally to differentiate
 * between various rendering strategies when processing routes.
 *
 * - `RenderMode.Prerender` maps to `'ssg'` (Static Site Generation).
 * - `RenderMode.Server` maps to `'ssr'` (Server-Side Rendering).
 * - `RenderMode.Client` maps to an empty string `''` (Client-Side Rendering, no server context needed).
 */
const SERVER_CONTEXT_VALUE: Record<RenderMode, string> = {
  [RenderMode.Prerender]: 'ssg',
  [RenderMode.Server]: 'ssr',
  [RenderMode.Client]: '',
};

/**
 * Options for configuring an `AngularServerApp`.
 */
interface AngularServerAppOptions {
  /**
   * Whether to allow rendering of prerendered routes.
   *
   * When enabled, prerendered routes will be served directly. When disabled, they will be
   * rendered on demand.
   *
   * Defaults to `false`.
   */
  allowStaticRouteRender?: boolean;

  /**
   *  Hooks for extending or modifying server behavior.
   *
   * This allows customization of the server's rendering process and other lifecycle events.
   *
   * If not provided, a new `Hooks` instance is created.
   */
  hooks?: Hooks;
}

/**
 * Represents a locale-specific Angular server application managed by the server application engine.
 *
 * The `AngularServerApp` class handles server-side rendering and asset management for a specific locale.
 */
export class AngularServerApp {
  /**
   * Whether prerendered routes should be rendered on demand or served directly.
   *
   * @see {@link AngularServerAppOptions.allowStaticRouteRender} for more details.
   */
  private readonly allowStaticRouteRender: boolean;

  /**
   * Hooks for extending or modifying server behavior.
   *
   * @see {@link AngularServerAppOptions.hooks} for more details.
   */
  readonly hooks: Hooks;

  /**
   * Constructs an instance of `AngularServerApp`.
   *
   * @param options Optional configuration options for the server application.
   */
  constructor(private readonly options: Readonly<AngularServerAppOptions> = {}) {
    this.allowStaticRouteRender = this.options.allowStaticRouteRender ?? false;
    this.hooks = options.hooks ?? new Hooks();

    if (this.manifest.inlineCriticalCss) {
      this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor((path: string) => {
        const fileName = path.split('/').pop() ?? path;

        return this.assets.getServerAsset(fileName).text();
      });
    }
  }

  /**
   * The manifest associated with this server application.
   */
  private readonly manifest = getAngularAppManifest();

  /**
   * An instance of ServerAsset that handles server-side asset.
   */
  private readonly assets = new ServerAssets(this.manifest);

  /**
   * The router instance used for route matching and handling.
   */
  private router: ServerRouter | undefined;

  /**
   * The `inlineCriticalCssProcessor` is responsible for handling critical CSS inlining.
   */
  private inlineCriticalCssProcessor: InlineCriticalCssProcessor | undefined;

  /**
   * The bootstrap mechanism for the server application.
   */
  private boostrap: AngularBootstrap | undefined;

  /**
   * Decorder used to convert a string to a Uint8Array.
   */
  private readonly textDecoder = new TextEncoder();

  /**
   * Cache for storing critical CSS for pages.
   * Stores a maximum of MAX_INLINE_CSS_CACHE_ENTRIES entries.
   *
   * Uses an LRU (Least Recently Used) eviction policy, meaning that when the cache is full,
   * the least recently accessed page's critical CSS will be removed to make space for new entries.
   */
  private readonly criticalCssLRUCache = new LRUCache<string, string>(MAX_INLINE_CSS_CACHE_ENTRIES);

  /**
   * Handles an incoming HTTP request by serving prerendered content, performing server-side rendering,
   * or delivering a static file for client-side rendered routes based on the `RenderMode` setting.
   *
   * @param request - The HTTP request to handle.
   * @param requestContext - Optional context for rendering, such as metadata associated with the request.
   * @returns A promise that resolves to the resulting HTTP response object, or `null` if no matching Angular route is found.
   *
   * @remarks A request to `https://www.example.com/page/index.html` will serve or render the Angular route
   * corresponding to `https://www.example.com/page`.
   */
  async handle(request: Request, requestContext?: unknown): Promise<Response | null> {
    const url = new URL(request.url);
    this.router ??= await ServerRouter.from(this.manifest, url);
    const matchedRoute = this.router.match(url);

    if (!matchedRoute) {
      // Not a known Angular route.
      return null;
    }

    const { redirectTo, status, renderMode } = matchedRoute;
    if (redirectTo !== undefined) {
      return new Response(null, {
        // Note: The status code is validated during route extraction.
        // 302 Found is used by default for redirections
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
        status: status ?? 302,
        headers: {
          'Location': buildPathWithParams(redirectTo, url.pathname),
        },
      });
    }

    if (renderMode === RenderMode.Prerender) {
      const response = await this.handleServe(request, matchedRoute);
      if (response) {
        return response;
      }
    }

    return promiseWithAbort(
      this.handleRendering(request, matchedRoute, requestContext),
      request.signal,
      `Request for: ${request.url}`,
    );
  }

  /**
   * Handles serving a prerendered static asset if available for the matched route.
   *
   * This method only supports `GET` and `HEAD` requests.
   *
   * @param request - The incoming HTTP request for serving a static page.
   * @param matchedRoute - The metadata of the matched route for rendering.
   * If not provided, the method attempts to find a matching route based on the request URL.
   * @returns A promise that resolves to a `Response` object if the prerendered page is found, or `null`.
   */
  private async handleServe(
    request: Request,
    matchedRoute: RouteTreeNodeMetadata,
  ): Promise<Response | null> {
    const { headers, renderMode } = matchedRoute;
    if (renderMode !== RenderMode.Prerender) {
      return null;
    }

    const { method } = request;
    if (method !== 'GET' && method !== 'HEAD') {
      return null;
    }

    const assetPath = this.buildServerAssetPathFromRequest(request);
    const {
      manifest: { locale },
      assets,
    } = this;

    if (!assets.hasServerAsset(assetPath)) {
      return null;
    }

    const { text, hash, size } = assets.getServerAsset(assetPath);
    const etag = `"${hash}"`;

    return request.headers.get('if-none-match') === etag
      ? new Response(undefined, { status: 304, statusText: 'Not Modified' })
      : new Response(await text(), {
          headers: {
            'Content-Length': size.toString(),
            'ETag': etag,
            'Content-Type': 'text/html;charset=UTF-8',
            ...(locale !== undefined ? { 'Content-Language': locale } : {}),
            ...headers,
          },
        });
  }

  /**
   * Handles the server-side rendering process for the given HTTP request.
   * This method matches the request URL to a route and performs rendering if a matching route is found.
   *
   * @param request - The incoming HTTP request to be processed.
   * @param matchedRoute - The metadata of the matched route for rendering.
   * If not provided, the method attempts to find a matching route based on the request URL.
   * @param requestContext - Optional additional context for rendering, such as request metadata.
   *
   * @returns A promise that resolves to the rendered response, or null if no matching route is found.
   */
  private async handleRendering(
    request: Request,
    matchedRoute: RouteTreeNodeMetadata,
    requestContext?: unknown,
  ): Promise<Response | null> {
    const { renderMode, headers, status, preload } = matchedRoute;

    if (!this.allowStaticRouteRender && renderMode === RenderMode.Prerender) {
      return null;
    }

    const url = new URL(request.url);
    const platformProviders: StaticProvider[] = [];

    const {
      manifest: { bootstrap, locale },
      assets,
    } = this;

    // Initialize the response with status and headers if available.
    const responseInit = {
      status,
      headers: new Headers({
        'Content-Type': 'text/html;charset=UTF-8',
        ...(locale !== undefined ? { 'Content-Language': locale } : {}),
        ...headers,
      }),
    };

    if (renderMode === RenderMode.Server) {
      // Configure platform providers for request and response only for SSR.
      platformProviders.push(
        {
          provide: REQUEST,
          useValue: request,
        },
        {
          provide: REQUEST_CONTEXT,
          useValue: requestContext,
        },
        {
          provide: RESPONSE_INIT,
          useValue: responseInit,
        },
      );
    } else if (renderMode === RenderMode.Client) {
      // Serve the client-side rendered version if the route is configured for CSR.
      let html = await this.assets.getServerAsset('index.csr.html').text();
      html = await this.runTransformsOnHtml(html, url, preload);

      return new Response(html, responseInit);
    }

    if (locale !== undefined) {
      platformProviders.push({
        provide: LOCALE_ID,
        useValue: locale,
      });
    }

    this.boostrap ??= await bootstrap();
    let html = await assets.getIndexServerHtml().text();
    html = await this.runTransformsOnHtml(html, url, preload);

    const { content } = await renderAngular(
      html,
      this.boostrap,
      url,
      platformProviders,
      SERVER_CONTEXT_VALUE[renderMode],
    );

    const { inlineCriticalCssProcessor, criticalCssLRUCache, textDecoder } = this;

    // Use a stream to send the response before finishing rendering and inling critical CSS, improving performance via header flushing.
    const stream = new ReadableStream({
      async start(controller) {
        const renderedHtml = await content();

        if (!inlineCriticalCssProcessor) {
          controller.enqueue(textDecoder.encode(renderedHtml));
          controller.close();

          return;
        }

        let htmlWithCriticalCss;
        try {
          if (renderMode === RenderMode.Server) {
            const cacheKey = await sha256(renderedHtml);
            htmlWithCriticalCss = criticalCssLRUCache.get(cacheKey);
            if (!htmlWithCriticalCss) {
              htmlWithCriticalCss = await inlineCriticalCssProcessor.process(renderedHtml);
              criticalCssLRUCache.put(cacheKey, htmlWithCriticalCss);
            }
          } else {
            htmlWithCriticalCss = await inlineCriticalCssProcessor.process(renderedHtml);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`An error occurred while inlining critical CSS for: ${url}.`, error);
        }

        controller.enqueue(textDecoder.encode(htmlWithCriticalCss ?? renderedHtml));
        controller.close();
      },
    });

    return new Response(stream, responseInit);
  }

  /**
   * Constructs the asset path on the server based on the provided HTTP request.
   *
   * This method processes the incoming request URL to derive a path corresponding
   * to the requested asset. It ensures the path points to the correct file (e.g.,
   * `index.html`) and removes any base href if it is not part of the asset path.
   *
   * @param request - The incoming HTTP request object.
   * @returns The server-relative asset path derived from the request.
   */
  private buildServerAssetPathFromRequest(request: Request): string {
    let { pathname: assetPath } = new URL(request.url);
    if (!assetPath.endsWith('/index.html')) {
      // Append "index.html" to build the default asset path.
      assetPath = joinUrlParts(assetPath, 'index.html');
    }

    const { baseHref } = this.manifest;
    // Check if the asset path starts with the base href and the base href is not (`/` or ``).
    if (baseHref.length > 1 && assetPath.startsWith(baseHref)) {
      // Remove the base href from the start of the asset path to align with server-asset expectations.
      assetPath = assetPath.slice(baseHref.length);
    }

    return stripLeadingSlash(assetPath);
  }

  /**
   * Runs the registered transform hooks on the given HTML content.
   *
   * @param html - The raw HTML content to be transformed.
   * @param url - The URL associated with the HTML content, used for context during transformations.
   * @param preload - An array of URLs representing the JavaScript resources to preload.
   * @returns A promise that resolves to the transformed HTML string.
   */
  private async runTransformsOnHtml(
    html: string,
    url: URL,
    preload: readonly string[] | undefined,
  ): Promise<string> {
    if (this.hooks.has('html:transform:pre')) {
      html = await this.hooks.run('html:transform:pre', { html, url });
    }

    if (preload?.length) {
      html = appendPreloadHintsToHtml(html, preload);
    }

    return html;
  }
}

let angularServerApp: AngularServerApp | undefined;

/**
 * Retrieves or creates an instance of `AngularServerApp`.
 * - If an instance of `AngularServerApp` already exists, it will return the existing one.
 * - If no instance exists, it will create a new one with the provided options.
 *
 * @param options Optional configuration options for the server application.
 *
 * @returns The existing or newly created instance of `AngularServerApp`.
 */
export function getOrCreateAngularServerApp(
  options?: Readonly<AngularServerAppOptions>,
): AngularServerApp {
  return (angularServerApp ??= new AngularServerApp(options));
}

/**
 * Destroys the existing `AngularServerApp` instance, releasing associated resources and resetting the
 * reference to `undefined`.
 *
 * This function is primarily used to enable the recreation of the `AngularServerApp` instance,
 * typically when server configuration or application state needs to be refreshed.
 */
export function destroyAngularServerApp(): void {
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    // Need to clean up GENERATED_COMP_IDS map in `@angular/core`.
    // Otherwise an incorrect component ID generation collision detected warning will be displayed in development.
    // See: https://github.com/angular/angular-cli/issues/25924
    ɵresetCompiledComponents();
  }

  angularServerApp = undefined;
}

/**
 * Appends module preload hints to an HTML string for specified JavaScript resources.
 * This function enhances the HTML by injecting `<link rel="modulepreload">` elements
 * for each provided resource, allowing browsers to preload the specified JavaScript
 * modules for better performance.
 *
 * @param html - The original HTML string to which preload hints will be added.
 * @param preload - An array of URLs representing the JavaScript resources to preload.
 * @returns The modified HTML string with the preload hints injected before the closing `</body>` tag.
 *          If `</body>` is not found, the links are not added.
 */
function appendPreloadHintsToHtml(html: string, preload: readonly string[]): string {
  const bodyCloseIdx = html.lastIndexOf('</body>');
  if (bodyCloseIdx === -1) {
    return html;
  }

  // Note: Module preloads should be placed at the end before the closing body tag to avoid a performance penalty.
  // Placing them earlier can cause the browser to prioritize downloading these modules
  // over other critical page resources like images, CSS, and fonts.
  return [
    html.slice(0, bodyCloseIdx),
    ...preload.map((val) => `<link rel="modulepreload" href="${val}">`),
    html.slice(bodyCloseIdx),
  ].join('\n');
}
