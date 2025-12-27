/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Utility functions shared across MCP tools.
 */

import { workspaces } from '@angular-devkit/core';
import { dirname, join } from 'node:path';
import { CommandError, LocalWorkspaceHost } from './host';
import { McpToolContext } from './tools/tool-registry';

/**
 * Returns simple structured content output from an MCP tool.
 *
 * @returns A structure with both `content` and `structuredContent` for maximum compatibility.
 */
export function createStructuredContentOutput<OutputType>(structuredContent: OutputType) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

/**
 * Searches for an angular.json file by traversing up the directory tree from a starting directory.
 *
 * @param startDir The directory path to start searching from
 * @param host The workspace host instance used to check file existence. Defaults to LocalWorkspaceHost
 * @returns The absolute path to the directory containing angular.json, or null if not found
 *
 * @remarks
 * This function performs an upward directory traversal starting from `startDir`.
 * It checks each directory for the presence of an angular.json file until either:
 * - The file is found (returns the directory path)
 * - The root of the filesystem is reached (returns null)
 */
export function findAngularJsonDir(startDir: string, host = LocalWorkspaceHost): string | null {
  let currentDir = startDir;
  while (true) {
    if (host.existsSync(join(currentDir, 'angular.json'))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Searches for a project in the current workspace, by name.
 */
export function getProject(
  context: McpToolContext,
  name: string,
): workspaces.ProjectDefinition | undefined {
  const projects = context.workspace?.projects;
  if (!projects) {
    return undefined;
  }

  return projects.get(name);
}

/**
 * Returns the name of the default project in the current workspace, or undefined if none exists.
 *
 * If no default project is defined but there's only a single project in the workspace, its name will
 * be returned.
 */
export function getDefaultProjectName(context: McpToolContext): string | undefined {
  const projects = context.workspace?.projects;

  if (!projects) {
    return undefined;
  }

  const defaultProjectName = context.workspace?.extensions['defaultProject'] as string | undefined;
  if (defaultProjectName) {
    return defaultProjectName;
  }

  // No default project defined? This might still be salvageable if only a single project exists.
  if (projects.size === 1) {
    return Array.from(projects.keys())[0];
  }

  return undefined;
}

/**
 * Get the logs of a failing command.
 *
 * This call has fallbacks in case the exception was thrown from the command-calling code itself.
 */
export function getCommandErrorLogs(e: unknown): string[] {
  if (e instanceof CommandError) {
    return [...e.logs, e.message];
  } else if (e instanceof Error) {
    return [e.message];
  } else {
    return [String(e)];
  }
}
