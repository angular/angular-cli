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
import { AngularWorkspace } from '../../utilities/config';
import { CommandError, type Host, LocalWorkspaceHost } from './host';
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
export function getDefaultProjectName(workspace: AngularWorkspace | undefined): string | undefined {
  const projects = workspace?.projects;

  if (!projects) {
    return undefined;
  }

  const defaultProjectName = workspace?.extensions['defaultProject'] as string | undefined;
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

export function createWorkspaceNotFoundError(): Error {
  return new Error(
    'Could not find an Angular workspace (angular.json) in the current directory. ' +
      "You can use 'list_projects' to find available workspaces.",
  );
}

export function createWorkspacePathDoesNotExistError(path: string): Error {
  return new Error(
    `Workspace path does not exist: ${path}. ` +
      "You can use 'list_projects' to find available workspaces.",
  );
}

export function createNoAngularJsonFoundError(path: string): Error {
  return new Error(
    `No angular.json found at ${path}. ` +
      "You can use 'list_projects' to find available workspaces.",
  );
}

export function createProjectNotFoundError(projectName: string, workspacePath: string): Error {
  return new Error(
    `Project '${projectName}' not found in workspace path ${workspacePath}. ` +
      "You can use 'list_projects' to find available projects.",
  );
}

export function createNoProjectResolvedError(workspacePath: string): Error {
  return new Error(
    `No project name provided and no default project found in workspace path ${workspacePath}. ` +
      'Please provide a project name or set a default project in angular.json. ' +
      "You can use 'list_projects' to find available projects.",
  );
}

export function createDevServerNotFoundError(
  devservers: Map<string, { project: string; workspacePath: string }>,
): Error {
  if (devservers.size === 0) {
    return new Error('No development servers are currently running.');
  }

  const runningServers = Array.from(devservers.values())
    .map((server) => `- Project '${server.project}' in workspace path '${server.workspacePath}'`)
    .join('\n');

  return new Error(
    `Dev server not found. Currently running servers:\n${runningServers}\n` +
      'Please provide the correct workspace and project arguments.',
  );
}

/**
 * Resolves workspace and project for tools to operate on.
 *
 * If `workspacePathInput` is absent, uses the MCP's configured workspace. If none is configured, use the
 * current directory as the workspace.
 * If `projectNameInput` is absent, uses the default project in the workspace.
 */
export async function resolveWorkspaceAndProject({
  host,
  workspacePathInput,
  projectNameInput,
  mcpWorkspace,
  workspaceLoader = AngularWorkspace.load,
}: {
  host: Host;
  workspacePathInput?: string;
  projectNameInput?: string;
  mcpWorkspace?: AngularWorkspace;
  workspaceLoader?: (path: string) => Promise<AngularWorkspace>;
}): Promise<{
  workspace: AngularWorkspace;
  workspacePath: string;
  projectName: string;
}> {
  let workspacePath: string;
  let workspace: AngularWorkspace;

  if (workspacePathInput) {
    if (!host.existsSync(workspacePathInput)) {
      throw createWorkspacePathDoesNotExistError(workspacePathInput);
    }
    if (!host.existsSync(join(workspacePathInput, 'angular.json'))) {
      throw createNoAngularJsonFoundError(workspacePathInput);
    }
    workspacePath = workspacePathInput;
    const configPath = join(workspacePath, 'angular.json');
    try {
      workspace = await workspaceLoader(configPath);
    } catch (e) {
      throw new Error(
        `Failed to load workspace configuration at ${configPath}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  } else if (mcpWorkspace) {
    workspace = mcpWorkspace;
    workspacePath = workspace.basePath;
  } else {
    const found = findAngularJsonDir(process.cwd(), host);

    if (!found) {
      throw createWorkspaceNotFoundError();
    }
    workspacePath = found;
    const configPath = join(workspacePath, 'angular.json');
    try {
      workspace = await workspaceLoader(configPath);
    } catch (e) {
      throw new Error(
        `Failed to load workspace configuration at ${configPath}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  let projectName = projectNameInput;
  if (projectName) {
    if (!workspace.projects.has(projectName)) {
      throw createProjectNotFoundError(projectName, workspacePath);
    }
  } else {
    projectName = getDefaultProjectName(workspace);
  }

  if (!projectName) {
    throw createNoProjectResolvedError(workspacePath);
  }

  return { workspace, workspacePath, projectName };
}
