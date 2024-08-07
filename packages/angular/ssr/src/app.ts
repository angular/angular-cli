/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Hooks } from './hooks';
import { getAngularAppManifest } from './manifest';
import { ServerRenderContext, render } from './render';

/**
 * Configuration options for initializing a `AngularServerApp` instance.
 */
export interface AngularServerAppOptions {
  /**
   * Indicates whether the application is in development mode.
   *
   * When set to `true`, the application runs in development mode with additional debugging features.
   */
  isDevMode?: boolean;

  /**
   * Optional hooks for customizing the server application's behavior.
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
   * The manifest associated with this server application.
   * @internal
   */
  readonly manifest = getAngularAppManifest();

  /**
   * Hooks for extending or modifying the behavior of the server application.
   * This instance can be used to attach custom functionality to various events in the server application lifecycle.
   * @internal
   */
  readonly hooks: Hooks;

  /**
   * Specifies if the server application is operating in development mode.
   * This property controls the activation of features intended for production, such as caching mechanisms.
   * @internal
   */
  readonly isDevMode: boolean;

  /**
   * Creates a new `AngularServerApp` instance with the provided configuration options.
   *
   * @param options - The configuration options for the server application.
   * - `isDevMode`: Flag indicating if the application is in development mode.
   * - `hooks`: Optional hooks for customizing application behavior.
   */
  constructor(options: AngularServerAppOptions) {
    this.isDevMode = options.isDevMode ?? false;
    this.hooks = options.hooks ?? new Hooks();
  }

  /**
   * Renders a response for the given HTTP request using the server application.
   *
   * This method processes the request and returns a response based on the specified rendering context.
   *
   * @param request - The incoming HTTP request to be rendered.
   * @param requestContext - Optional additional context for rendering, such as request metadata.
   * @param serverContext - The rendering context.
   *
   * @returns A promise that resolves to the HTTP response object resulting from the rendering.
   */
  render(
    request: Request,
    requestContext?: unknown,
    serverContext: ServerRenderContext = ServerRenderContext.SSR,
  ): Promise<Response> {
    return render(this, request, serverContext, requestContext);
  }

  /**
   * Retrieves the content of a server-side asset using its path.
   *
   * This method fetches the content of a specific asset defined in the server application's manifest.
   *
   * @param path - The path to the server asset.
   * @returns A promise that resolves to the asset content as a string.
   * @throws Error If the asset path is not found in the manifest, an error is thrown.
   */
  async getServerAsset(path: string): Promise<string> {
    const asset = this.manifest.assets[path];
    if (!asset) {
      throw new Error(`Server asset '${path}' does not exist.`);
    }

    return asset();
  }
}
