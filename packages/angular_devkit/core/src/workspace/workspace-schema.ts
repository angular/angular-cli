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
   * Tool options.
   */
  cli?: {
    /**
     * Link to schema.
     */
    $schema?: string;
    [k: string]: any;
  };
  /**
   * Tool options.
   */
  schematics?: {
    /**
     * Link to schema.
     */
    $schema?: string;
    [k: string]: any;
  };
  /**
   * Tool options.
   */
  architect?: {
    /**
     * Link to schema.
     */
    $schema?: string;
    [k: string]: any;
  };
  /**
   * A map of project names to project options.
   */
  projects: {
    [k: string]: Project;
  };
}
/**
 * Project options.
 */
export interface Project {
  /**
   * Project type.
   */
  projectType: "application" | "library";
  /**
   * Root of the project sourcefiles.
   */
  root: string;
  /**
   * Tool options.
   */
  cli?: {
    /**
     * Link to schema.
     */
    $schema?: string;
    [k: string]: any;
  };
  /**
   * Tool options.
   */
  schematics?: {
    /**
     * Link to schema.
     */
    $schema?: string;
    [k: string]: any;
  };
  /**
   * Tool options.
   */
  architect?: Architect;
}
/**
 * Architect options.
 */
export interface Architect {
  /**
   * Link to schema.
   */
  $schema?: string;
  [k: string]: any;
}
