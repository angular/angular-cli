/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppManifest } from './manifest';

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
   * @param path - The path to the server asset.
   * @returns A promise that resolves to the asset content as a string.
   * @throws Error If the asset path is not found in the manifest, an error is thrown.
   */
  async getServerAsset(path: string): Promise<string> {
    const asset = this.manifest.assets.get(path);
    if (!asset) {
      throw new Error(`Server asset '${path}' does not exist.`);
    }

    return asset();
  }

  /**
   * Checks if a specific server-side asset exists.
   *
   * @param path - The path to the server asset.
   * @returns A boolean indicating whether the asset exists.
   */
  hasServerAsset(path: string): boolean {
    return this.manifest.assets.has(path);
  }

  /**
   * Retrieves and caches the content of 'index.server.html'.
   *
   * @returns A promise that resolves to the content of 'index.server.html'.
   * @throws Error If there is an issue retrieving the asset.
   */
  getIndexServerHtml(): Promise<string> {
    return this.getServerAsset('index.server.html');
  }
}
