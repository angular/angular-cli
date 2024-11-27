/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppManifest } from '../manifest';
import { stripIndexHtmlFromURL } from '../utils/url';
import { extractRoutesAndCreateRouteTree } from './ng-routes';
import { RouteTree, RouteTreeNodeMetadata } from './route-tree';

/**
 * Manages the application's server routing logic by building and maintaining a route tree.
 *
 * This class is responsible for constructing the route tree from the Angular application
 * configuration and using it to match incoming requests to the appropriate routes.
 */
export class ServerRouter {
  /**
   * Creates an instance of the `ServerRouter`.
   *
   * @param routeTree - An instance of `RouteTree` that holds the routing information.
   * The `RouteTree` is used to match request URLs to the appropriate route metadata.
   */
  private constructor(private readonly routeTree: RouteTree) {}

  /**
   * Static property to track the ongoing build promise.
   */
  static #extractionPromise: Promise<ServerRouter> | undefined;

  /**
   * Creates or retrieves a `ServerRouter` instance based on the provided manifest and URL.
   *
   * If the manifest contains pre-built routes, a new `ServerRouter` is immediately created.
   * Otherwise, it builds the router by extracting routes from the Angular configuration
   * asynchronously. This method ensures that concurrent builds are prevented by re-using
   * the same promise.
   *
   * @param manifest - An instance of `AngularAppManifest` that contains the route information.
   * @param url - The URL for server-side rendering. The URL is needed to configure `ServerPlatformLocation`.
   * This is necessary to ensure that API requests for relative paths succeed, which is crucial for correct route extraction.
   * [Reference](https://github.com/angular/angular/blob/d608b857c689d17a7ffa33bbb510301014d24a17/packages/platform-server/src/location.ts#L51)
   * @returns A promise resolving to a `ServerRouter` instance.
   */
  static from(manifest: AngularAppManifest, url: URL): Promise<ServerRouter> {
    if (manifest.routes) {
      const routeTree = RouteTree.fromObject(manifest.routes);

      return Promise.resolve(new ServerRouter(routeTree));
    }

    // Create and store a new promise for the build process.
    // This prevents concurrent builds by re-using the same promise.
    ServerRouter.#extractionPromise ??= extractRoutesAndCreateRouteTree({ url, manifest })
      .then(({ routeTree, errors }) => {
        if (errors.length > 0) {
          throw new Error(
            'Error(s) occurred while extracting routes:\n' +
              errors.map((error) => `- ${error}`).join('\n'),
          );
        }

        return new ServerRouter(routeTree);
      })
      .finally(() => {
        ServerRouter.#extractionPromise = undefined;
      });

    return ServerRouter.#extractionPromise;
  }

  /**
   * Matches a request URL against the route tree to retrieve route metadata.
   *
   * This method strips 'index.html' from the URL if it is present and then attempts
   * to find a match in the route tree. If a match is found, it returns the associated
   * route metadata; otherwise, it returns `undefined`.
   *
   * @param url - The URL to be matched against the route tree.
   * @returns The metadata for the matched route or `undefined` if no match is found.
   */
  match(url: URL): RouteTreeNodeMetadata | undefined {
    // Strip 'index.html' from URL if present.
    // A request to `http://www.example.com/page/index.html` will render the Angular route corresponding to `http://www.example.com/page`.
    const { pathname } = stripIndexHtmlFromURL(url);

    return this.routeTree.match(decodeURIComponent(pathname));
  }
}
