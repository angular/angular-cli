/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  /**
   * The directory name to create the workspace in.
   */
  directory?: string;
  /**
   * The name of the workspace.
   */
  name: string;
  /**
   * EXPERIMENTAL: Specifies whether to create a new application which uses the Ivy rendering
   * engine.
   */
  experimentalIvy?: boolean;
  /**
   * Skip installing dependency packages.
   */
  skipInstall?: boolean;
  /**
   * Link CLI to global version (internal development only).
   */
  linkCli?: boolean;
  /**
   * Skip initializing a git repository.
   */
  skipGit?: boolean;
  /**
   * Initial repository commit information.
   */
  commit?: { name: string, email: string, message?: string } | boolean;
  /**
   * The path where new projects will be created.
   */
  newProjectRoot?: string;
  /**
   * The version of the Angular CLI to use.
   */
  version?: string;
  /**
   * Specifies if the style will be in the ts file.
   */
  inlineStyle?: boolean;
  /**
   * Specifies if the template will be in the ts file.
   */
  inlineTemplate?: boolean;
  /**
   * Specifies the view encapsulation strategy.
   */
  viewEncapsulation?: ('Emulated' | 'Native' | 'None');
  /**
   * Generates a routing module.
   */
  routing?: boolean;
  /**
   * The prefix to apply to generated selectors.
   */
  prefix?: string;
  /**
   * The file extension to be used for style files.
   */
  style?: string;
  /**
   * Skip creating spec files.
   */
  skipTests?: boolean;
}
