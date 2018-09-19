/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
export interface WorkspaceSchema {
  /**
   * Link to schema.
   */
  $schema?: string;
  /**
   * Workspace Schema version.
   */
  version: number;
  /**
   * New project root.
   */
  newProjectRoot?: string;
  /**
   * The default project.
   */
  defaultProject?: string;
  /**
   * Tool options.
   */
  cli?: WorkspaceTool;
  /**
   * Tool options.
   */
  schematics?: WorkspaceTool;
  /**
   * Tool options.
   */
  architect?: WorkspaceTool;
  /**
   * Tool options.
   */
  targets?: WorkspaceTool;
  /**
   * A map of project names to project options.
   */
  projects: {
    [k: string]: WorkspaceProject;
  };
}
/**
 * Project options.
 */
export interface WorkspaceProject {
  /**
   * Project type.
   */
  projectType: "application" | "library";
  /**
   * Root of the project sourcefiles.
   */
  root: string;
  /**
   * The root of the source files, assets and index.html file structure.
   */
  sourceRoot?: string;
  /**
   * The prefix to apply to generated selectors.
   */
  prefix: string;
  /**
   * Tool options.
   */
  cli?: WorkspaceTool;
  /**
   * Tool options.
   */
  schematics?: WorkspaceTool;
  /**
   * Tool options.
   */
  architect?: WorkspaceTool;
  /**
   * Tool options.
   */
  targets?: WorkspaceTool;
}
/**
 * Architect options.
 */
export interface WorkspaceTool {
  /**
   * Link to schema.
   */
  $schema?: string;
  [k: string]: any;
}
