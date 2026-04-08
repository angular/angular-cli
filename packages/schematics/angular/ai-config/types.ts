/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { Tool } from './schema';

/**
 * Types of supported AI configuration files.
 */
export enum ContextFileType {
  /** Represents a Markdown AI instructions file (e.g. AGENTS.md). */
  BestPracticesMd = 0,

  /** Represents an MCP server configuration (e.g. Angular MCP).  */
  McpConfig = 1,
}

/**
 * AI configuration file metadata.
 */
export interface ContextFileInfo {
  type: ContextFileType;
  name: string;
  directory: string;
}

/**
 * Represents the file configuration handler options
 * that are normally passed to the handler functions.
 */
export type FileConfigurationHandlerOptions = {
  tree: Tree;
  context: SchematicContext;
  fileInfo: ContextFileInfo;
  tool: Tool;
};
