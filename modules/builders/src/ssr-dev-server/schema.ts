/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  /** Browser target to build. */
  browserTarget: string;

  /** Server target to build. */
  serverTarget: string;

  /** Host to listen on. */
  host?: string;

  /**
   * Port to start the sync server at.
   * Default is 4200. Pass 0 to get a dynamically assigned port.
   */
  port?: number;

  /** Log progress to the console while building. */
  progress: boolean;

  /** Opens the url in default browser. */
  open?: boolean;

  /**
   * The URL that the browser client should use to connect to the development server.
   * Use for a complex dev server setup, such as one with reverse proxies.
   */
  publicHost?: string;

  /** Serve using HTTPS. */
  ssl?: boolean;

  /** SSL key to use for serving HTTPS. */
  sslKey?: string;

  /** SSL certificate to use for serving HTTPS. */
  sslCert?: string;
}
