/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppManifest, ServerAsset } from './manifest';

/**
 * Manages server-side assets.
 */
export class ServerAssets {
  /**
   * Creates an instance of ServerAsset.
   *
   * @param manifest - The manifest containing the server assets.
   */
  constructor(private readonly manifest: AngularAppManifest) {}

  /**
   * Retrieves the content of a server-side asset using its path.
   *
   * @param path - The path to the server asset within the manifest.
   * @returns The server asset associated with the provided path, as a `ServerAsset` object.
   * @throws Error - Throws an error if the asset does not exist.
   */
  getServerAsset(path: string): ServerAsset {
    const asset = this.manifest.assets[path];
    if (!asset) {
      throw new Error(`Server asset '${path}' does not exist.`);
    }

    return asset;
  }

  /**
   * Checks if a specific server-side asset exists.
   *
   * @param path - The path to the server asset.
   * @returns A boolean indicating whether the asset exists.
   */
  hasServerAsset(path: string): boolean {
    return !!this.manifest.assets[path];
  }

  /**
   * Retrieves the asset for 'index.server.html'.
   *
   * @returns The `ServerAsset` object for 'index.server.html'.
   * @throws Error - Throws an error if 'index.server.html' does not exist.
   */
  getIndexServerHtml(): ServerAsset {
    return this.getServerAsset('index.server.html');
  }
}
