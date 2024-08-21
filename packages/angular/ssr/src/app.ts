/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ServerAssets } from './assets';
import { Hooks } from './hooks';
import { getAngularAppManifest } from './manifest';
import { ServerRenderContext, render } from './render';
import { ServerRouter } from './routes/router';

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
   * @internal
   */
  readonly manifest = getAngularAppManifest();

  /**
   * An instance of ServerAsset that handles server-side asset.
   * @internal
   */
  readonly assets = new ServerAssets(this.manifest);

  /**
   * The router instance used for route matching and handling.
   */
  private router: ServerRouter | undefined;

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
  async render(
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

    return render(this, request, serverContext, requestContext);
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
 * Resets the instance of `AngularServerApp` to undefined, effectively
 * clearing the reference. Use this to recreate the instance.
 */
export function resetAngularServerApp(): void {
  angularServerApp = undefined;
}

/**
 * Destroys the existing `AngularServerApp` instance, releasing associated resources and resetting the
 * reference to `undefined`.
 *
 * This function is primarily used to enable the recreation of the `AngularServerApp` instance,
 * typically when server configuration or application state needs to be refreshed.
 */
export function destroyAngularServerApp(): void {
  angularServerApp = undefined;
}
