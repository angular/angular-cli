/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  /**
   * Name or index of related client app.
   */
  clientProject: string;
  /**
   * The appId to use withServerTransition.
   */
  appId?: string;
  /**
   * The name of the main entry-point file.
   */
  main?: string;
  /**
   * The name of the Hapi server file.
   */
  serverFileName?: string;
  /**
   * The port for the Hapi server.
   */
  serverPort?: number;
  /**
   * The name of the TypeScript configuration file.
   */
  tsconfigFileName?: string;
  /**
   * The name of the application directory.
   */
  appDir?: string;
  /**
   * The name of the root module file
   */
  rootModuleFileName?: string;
  /**
   * The name of the root module class.
   */
  rootModuleClassName?: string;
  /**
   * Skip installing dependency packages.
   */
  skipInstall?: boolean;
}
