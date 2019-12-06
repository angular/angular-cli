/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 export interface Schema {
  /**
   * Script that exports the Server AppModule to render. This should be the main JavaScript
   * outputted by the server target. By default we will resolve the outputPath of the
   * serverTarget and find a bundle named 'main' in it (whether or not there's a hash tag).
   */
  appModuleBundle?: string;
  /**
   * Target to build.
   */
  browserTarget: string;
  /**
   * The routes to render.
   */
  routes: string[];
  /**
   * Server target to use for prerendering the app.
   */
  serverTarget: string;
}
