/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { StaticProvider, ɵConsole, ɵresetCompiledComponents } from '@angular/core';
import { ɵSERVER_CONTEXT as SERVER_CONTEXT } from '@angular/platform-server';
import { ServerAssets } from './assets';
import { Console } from './console';
import { Hooks } from './hooks';
import { getAngularAppManifest } from './manifest';
import { ServerRouter } from './routes/router';
import { REQUEST, REQUEST_CONTEXT, RESPONSE_INIT } from './tokens';
import { InlineCriticalCssProcessor } from './utils/inline-critical-css';
import { renderAngular } from './utils/ng';

/**
 * Enum representing the different contexts in which server rendering can occur.
 */
export enum ServerRenderContext {
  SSR = 'ssr',
  SSG = 'ssg',
  AppShell = 'app-shell',
}

/**
 * Represents a locale-specific Angular server application managed by the server application engine.
 *
 * The `AngularServerApp` class handles server-side rendering and asset management for a specific locale.
 */
export class AngularServerApp {
  /**
   * Hooks for extending or modifying the behavior of the server application.
   * This instance can be used to attach custom functionality to various events in the server application lifecycle.
   */
  hooks = new Hooks();

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
   * Renders a response for the given HTTP request using the server application.
   *
   * This method processes the request and returns a response based on the specified rendering context.
   *
   * @param request - The incoming HTTP request to be rendered.
   * @param requestContext - Optional additional context for rendering, such as request metadata.
   * @param serverContext - The rendering context.
   *
   * @returns A promise that resolves to the HTTP response object resulting from the rendering, or null if no match is found.
   */
  render(
    request: Request,
    requestContext?: unknown,
    serverContext: ServerRenderContext = ServerRenderContext.SSR,
  ): Promise<Response | null> {
    return Promise.race([
      this.createAbortPromise(request),
      this.handleRendering(request, requestContext, serverContext),
    ]);
  }

  /**
   * Creates a promise that rejects when the request is aborted.
   *
   * @param request - The HTTP request to monitor for abortion.
   * @returns A promise that never resolves but rejects with an `AbortError` if the request is aborted.
   */
  private createAbortPromise(request: Request): Promise<never> {
    return new Promise<never>((_, reject) => {
      request.signal.addEventListener(
        'abort',
        () => {
          const abortError = new Error(
            `Request for: ${request.url} was aborted.\n${request.signal.reason}`,
          );
          abortError.name = 'AbortError';
          reject(abortError);
        },
        { once: true },
      );
    });
  }

  /**
   * Handles the server-side rendering process for the given HTTP request.
   * This method matches the request URL to a route and performs rendering if a matching route is found.
   *
   * @param request - The incoming HTTP request to be processed.
   * @param requestContext - Optional additional context for rendering, such as request metadata.
   * @param serverContext - The rendering context. Defaults to server-side rendering (SSR).
   *
   * @returns A promise that resolves to the rendered response, or null if no matching route is found.
   */
  private async handleRendering(
    request: Request,
    requestContext?: unknown,
    serverContext: ServerRenderContext = ServerRenderContext.SSR,
  ): Promise<Response | null> {
    const url = new URL(request.url);
    this.router ??= await ServerRouter.from(this.manifest, url);

    const matchedRoute = this.router.match(url);
    if (!matchedRoute) {
      // Not a known Angular route.
      return null;
    }

    const { redirectTo } = matchedRoute;
    if (redirectTo !== undefined) {
      // 302 Found is used by default for redirections
      // See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
      return Response.redirect(new URL(redirectTo, url), 302);
    }

    const platformProviders: StaticProvider[] = [
      {
        provide: SERVER_CONTEXT,
        useValue: serverContext,
      },
      {
        // An Angular Console Provider that does not print a set of predefined logs.
        provide: ɵConsole,
        // Using `useClass` would necessitate decorating `Console` with `@Injectable`,
        // which would require switching from `ts_library` to `ng_module`. This change
        // would also necessitate various patches of `@angular/bazel` to support ESM.
        useFactory: () => new Console(),
      },
    ];

    const isSsrMode = serverContext === ServerRenderContext.SSR;
    const responseInit: ResponseInit = {};

    if (isSsrMode) {
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
    }

    const { manifest, hooks, assets } = this;

    let html = await assets.getIndexServerHtml();
    // Skip extra microtask if there are no pre hooks.
    if (hooks.has('html:transform:pre')) {
      html = await hooks.run('html:transform:pre', { html });
    }

    html = await renderAngular(html, manifest.bootstrap(), new URL(request.url), platformProviders);

    if (manifest.inlineCriticalCss) {
      // Optionally inline critical CSS.
      this.inlineCriticalCssProcessor ??= new InlineCriticalCssProcessor((path: string) => {
        const fileName = path.split('/').pop() ?? path;

        return this.assets.getServerAsset(fileName);
      });

      html = await this.inlineCriticalCssProcessor.process(html);
    }

    return new Response(html, responseInit);
  }
}

let angularServerApp: AngularServerApp | undefined;

/**
 * Retrieves or creates an instance of `AngularServerApp`.
 * - If an instance of `AngularServerApp` already exists, it will return the existing one.
 * - If no instance exists, it will create a new one with the provided options.
 * @returns The existing or newly created instance of `AngularServerApp`.
 */
export function getOrCreateAngularServerApp(): AngularServerApp {
  return (angularServerApp ??= new AngularServerApp());
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
