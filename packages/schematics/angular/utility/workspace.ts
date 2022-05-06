/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, workspaces } from '@angular-devkit/core';
import { Rule, Tree, noop } from '@angular-devkit/schematics';
import { ProjectType } from './workspace-models';

const DEFAULT_WORKSPACE_PATH = '/angular.json';

// re-export the workspace definition types for convenience
export type WorkspaceDefinition = workspaces.WorkspaceDefinition;
export type ProjectDefinition = workspaces.ProjectDefinition;
export type TargetDefinition = workspaces.TargetDefinition;

/**
 * A {@link workspaces.WorkspaceHost} backed by a Schematics {@link Tree} instance.
 */
class TreeWorkspaceHost implements workspaces.WorkspaceHost {
  constructor(private readonly tree: Tree) {}

  async readFile(path: string): Promise<string> {
    return this.tree.readText(path);
  }

  async writeFile(path: string, data: string): Promise<void> {
    if (this.tree.exists(path)) {
      this.tree.overwrite(path, data);
    } else {
      this.tree.create(path, data);
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    // approximate a directory check
    return !this.tree.exists(path) && this.tree.getDir(path).subfiles.length > 0;
  }

  async isFile(path: string): Promise<boolean> {
    return this.tree.exists(path);
  }
}

/**
 * Updates the workspace file (`angular.json`) found within the root of the schematic's tree.
 * The workspace object model can be directly modified within the provided updater function
 * with changes being written to the workspace file after the updater function returns.
 * The spacing and overall layout of the file (including comments) will be maintained where
 * possible when updating the file.
 *
 * @param updater An update function that can be used to modify the object model for the
 * workspace. A {@link WorkspaceDefinition} is provided as the first argument to the function.
 */
export function updateWorkspace(
  updater: (workspace: WorkspaceDefinition) => void | Rule | PromiseLike<void | Rule>,
): Rule {
  return async (tree: Tree) => {
    const host = new TreeWorkspaceHost(tree);

    const { workspace } = await workspaces.readWorkspace(DEFAULT_WORKSPACE_PATH, host);

    const result = await updater(workspace);

    await workspaces.writeWorkspace(workspace, host);

    return result || noop;
  };
}

// TODO: This should be renamed `readWorkspace` once deep imports are restricted (already exported from `utility` with that name)
/**
 * Reads a workspace file (`angular.json`) from the provided {@link Tree} instance.
 *
 * @param tree A schematics {@link Tree} instance used to access the workspace file.
 * @param path The path where a workspace file should be found. If a file is specified, the file
 * path will be used. If a directory is specified, the file `angular.json` will be used from
 * within the specified directory. Defaults to `/angular.json`.
 * @returns A {@link WorkspaceDefinition} representing the workspace found at the specified path.
 */
export async function getWorkspace(
  tree: Tree,
  path = DEFAULT_WORKSPACE_PATH,
): Promise<WorkspaceDefinition> {
  const host = new TreeWorkspaceHost(tree);

  const { workspace } = await workspaces.readWorkspace(path, host);

  return workspace;
}

/**
 * Writes a workspace file (`angular.json`) to the provided {@link Tree} instance.
 * The spacing and overall layout of an exisitng file (including comments) will be maintained where
 * possible when writing the file.
 *
 * @param tree A schematics {@link Tree} instance used to access the workspace file.
 * @param workspace The {@link WorkspaceDefinition} to write.
 * @param path The path where a workspace file should be written. If a file is specified, the file
 * path will be used. If not provided, the definition's underlying file path stored during reading
 * will be used.
 */
export async function writeWorkspace(
  tree: Tree,
  workspace: WorkspaceDefinition,
  path?: string,
): Promise<void> {
  const host = new TreeWorkspaceHost(tree);

  return workspaces.writeWorkspace(workspace, host, path);
}

/**
 * Build a default project path for generating.
 * @param project The project which will have its default path generated.
 */
export function buildDefaultPath(project: workspaces.ProjectDefinition): string {
  const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;
  const projectDirName =
    project.extensions['projectType'] === ProjectType.Application ? 'app' : 'lib';

  return `${root}${projectDirName}`;
}

export async function createDefaultPath(tree: Tree, projectName: string): Promise<string> {
  const workspace = await getWorkspace(tree);
  const project = workspace.projects.get(projectName);
  if (!project) {
    throw new Error(`Project "${projectName}" does not exist.`);
  }

  return buildDefaultPath(project);
}

export function* allWorkspaceTargets(
  workspace: workspaces.WorkspaceDefinition,
): Iterable<[string, workspaces.TargetDefinition, string, workspaces.ProjectDefinition]> {
  for (const [projectName, project] of workspace.projects) {
    for (const [targetName, target] of project.targets) {
      yield [targetName, target, projectName, project];
    }
  }
}

export function* allTargetOptions(
  target: workspaces.TargetDefinition,
  skipBaseOptions = false,
): Iterable<[string | undefined, Record<string, json.JsonValue | undefined>]> {
  if (!skipBaseOptions && target.options) {
    yield [undefined, target.options];
  }

  if (!target.configurations) {
    return;
  }

  for (const [name, options] of Object.entries(target.configurations)) {
    if (options !== undefined) {
      yield [name, options];
    }
  }
}
