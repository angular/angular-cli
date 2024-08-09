/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppManifest } from '../manifest';
import { stripIndexHtmlFromURL } from '../utils/url';
import { getRoutesFromAngularRouterConfig } from './ng-routes';
import { RouteTree, RouteTreeNodeMetadata } from './route-tree';

/**
 * Manages the application's server routing logic by building and maintaining a route tree.
 */
export class ServerRouter {
  /** The route tree used for matching URLs to route metadata. */
  private routeTree: RouteTree | undefined;

  /**
   * Indicates whether the route tree needs to be extracted and built.
   * Initially set to `true` and set to `false` once the routes are built.
   */
  requiresRoutesToBeBuilt = true;

  /**
   * Creates an instance of the Router.
   *
   * @param manifest - An instance of `AngularAppManifest` that contains route information.
   * The manifest provides routing configuration and other details necessary for route management.
   */
  constructor(private manifest: AngularAppManifest) {
    if (manifest.routes) {
      // Initialize the route tree with pre-existing routes from the manifest.
      this.routeTree = RouteTree.fromObject(manifest.routes);
      this.requiresRoutesToBeBuilt = false;
    }
  }

  private buildPromise: Promise<void> | undefined; // Property to track the ongoing build promise

  /**
   * Builds the route tree.
   * If a build is already in progress, returns the existing promise.
   * @param url - The base URL for the routes.
   * @param html - The HTML document to be used by Angular.
   * @returns A promise that resolves when the route tree has been built.
   */
  buildRoutes(url: URL, html: string): Promise<void> {
    if (this.buildPromise) {
      return this.buildPromise;
    }

    // Create and store a new promise for the build process.
    // This prevents concurrent builds by re-using the same promise.
    this.buildPromise = (async () => {
      this.routeTree = new RouteTree();

      try {
        for await (const { route, redirectTo } of getRoutesFromAngularRouterConfig(
          this.manifest.bootstrap(),
          html,
          url,
        )) {
          this.routeTree.insert(route, { redirectTo });
        }
      } finally {
        this.requiresRoutesToBeBuilt = false;
        this.buildPromise = undefined;
      }
    })();

    return this.buildPromise;
  }

  /**
   * Matches a request URL against the route tree to retrieve route metadata.
   *
   * @param url - The URL to be matched against the route tree.
   * @returns The metadata for the matched route or `null` if no match is found.
   * @throws Will throw an error if the route tree has not been built.
   */
  match(url: URL): RouteTreeNodeMetadata | null {
    if (!this.routeTree) {
      throw new Error(`Router route tree is undefined. Did you call 'buildRoutes'?`);
    }

    // Strip 'index.html' from URL if present.
    // A request to `http://www.example.com/page/index.html` will render the Angular route corresponding to `http://www.example.com/page`.
    const { pathname } = stripIndexHtmlFromURL(url);

    return this.routeTree.match(decodeURIComponent(pathname));
  }
}
