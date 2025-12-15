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
 * A set of well-known URLs that are not handled by Angular.
 *
 * These URLs are typically for static assets or endpoints that should
 * bypass the Angular routing and rendering process.
 */
const WELL_KNOWN_NON_ANGULAR_URLS: ReadonlySet<string> = new Set<string>([
  'favicon.ico',
  '.well-known/appspecific/com.chrome.devtools.json',
]);

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
   * A cache that stores critical CSS to avoid re-processing for every request, improving performance.
   * This cache uses a Least Recently Used (LRU) eviction policy.
   *
   * @see {@link MAX_INLINE_CSS_CACHE_ENTRIES} for the maximum number of entries this cache can hold.
   */
  private readonly criticalCssLRUCache = new LRUCache<
    string,
    { shaOfContentPreInlinedCss: string; contentWithCriticialCSS: Uint8Array<ArrayBufferLike> }
  >(MAX_INLINE_CSS_CACHE_ENTRIES);

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
    if (WELL_KNOWN_NON_ANGULAR_URLS.has(url.pathname)) {
      return null;
    }

    this.router ??= await ServerRouter.from(this.manifest, url);
    const matchedRoute = this.router.match(url);

    if (!matchedRoute) {
      // Not a known Angular route.
      return null;
    }

    const { redirectTo, status, renderMode } = matchedRoute;

    if (redirectTo !== undefined) {
      return createRedirectResponse(
        joinUrlParts(
          request.headers.get('X-Forwarded-Prefix') ?? '',
          buildPathWithParams(redirectTo, url.pathname),
        ),
        status,
      );
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

    const result = await renderAngular(
      html,
      this.boostrap,
      url,
      platformProviders,
      SERVER_CONTEXT_VALUE[renderMode],
    );

    if (result.hasNavigationError) {
      return null;
    }

    if (result.redirectTo) {
      return createRedirectResponse(result.redirectTo, status);
    }

    if (renderMode === RenderMode.Prerender) {
      const renderedHtml = await result.content();
      const finalHtml = await this.inlineCriticalCss(renderedHtml, url);

      return new Response(finalHtml, responseInit);
    }

    // Use a stream to send the response before finishing rendering and inling critical CSS, improving performance via header flushing.
    const stream = new ReadableStream({
      start: async (controller) => {
        const renderedHtml = await result.content();
        const finalHtml = await this.inlineCriticalCssWithCache(renderedHtml, url);
        controller.enqueue(finalHtml);
        controller.close();
      },
    });

    return new Response(stream, responseInit);
  }

  /**
   * Inlines critical CSS into the given HTML content.
   *
   * @param html The HTML content to process.
   * @param url The URL associated with the request, for logging purposes.
   * @returns A promise that resolves to the HTML with inlined critical CSS.
   */
  private async inlineCriticalCss(html: string, url: URL): Promise<string> {
    const { inlineCriticalCssProcessor } = this;

    if (!inlineCriticalCssProcessor) {
      return html;
    }

    try {
      return await inlineCriticalCssProcessor.process(html);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`An error occurred while inlining critical CSS for: ${url}.`, error);

      return html;
    }
  }

  /**
   * Inlines critical CSS into the given HTML content.
   * This method uses a cache to avoid reprocessing the same HTML content multiple times.
   *
   * @param html The HTML content to process.
   * @param url The URL associated with the request, for logging purposes.
   * @returns A promise that resolves to the HTML with inlined critical CSS.
   */
  private async inlineCriticalCssWithCache(
    html: string,
    url: URL,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const { inlineCriticalCssProcessor, criticalCssLRUCache, textDecoder } = this;

    if (!inlineCriticalCssProcessor) {
      return textDecoder.encode(html);
    }

    const cacheKey = url.toString();
    const cached = criticalCssLRUCache.get(cacheKey);
    const shaOfContentPreInlinedCss = await sha256(html);
    if (cached?.shaOfContentPreInlinedCss === shaOfContentPreInlinedCss) {
      return cached.contentWithCriticialCSS;
    }

    const processedHtml = await this.inlineCriticalCss(html, url);
    const finalHtml = textDecoder.encode(processedHtml);
    criticalCssLRUCache.put(cacheKey, {
      shaOfContentPreInlinedCss,
      contentWithCriticialCSS: finalHtml,
    });

    return finalHtml;
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

/**
 * Creates an HTTP redirect response with a specified location and status code.
 *
 * @param location - The URL to which the response should redirect.
 * @param status - The HTTP status code for the redirection. Defaults to 302 (Found).
 *                 See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
 * @returns A `Response` object representing the HTTP redirect.
 */
function createRedirectResponse(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      'Location': location,
    },
  });
}
