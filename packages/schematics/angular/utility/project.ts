/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '../utility/config';
import { ProjectType, WorkspaceProject, WorkspaceSchema } from '../utility/workspace-models';


/**
 * Build a default project path for generating.
 * @param project The project to build the path for.
 */
export function buildDefaultPath(project: WorkspaceProject): string {
  const root = project.sourceRoot
    ? `/${project.sourceRoot}/`
    : `/${project.root}/src/`;

  const projectDirName = project.projectType === ProjectType.Application ? 'app' : 'lib';

  return `${root}${projectDirName}`;
}

export function getProject<TProjectType extends ProjectType = ProjectType.Application>(
  workspaceOrHost: WorkspaceSchema | Tree,
  projectName: string,
): WorkspaceProject<TProjectType> {
  const workspace = isWorkspaceSchema(workspaceOrHost)
    ? workspaceOrHost
    : getWorkspace(workspaceOrHost);

  return workspace.projects[projectName] as WorkspaceProject<TProjectType>;
}

export function isWorkspaceSchema(workspace: unknown): workspace is WorkspaceSchema {
  return !!(workspace && (workspace as WorkspaceSchema).projects);
}

export function isWorkspaceProject(project: unknown): project is WorkspaceProject {
  return !!(project && (project as WorkspaceProject).projectType);
}
