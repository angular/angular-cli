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


export function getProjectRoot(project: WorkspaceProject) {
  return project.sourceRoot
    ? `/${project.sourceRoot}/`
    : `/${project.root}/src/`;
}

/**
 * Build a default project path for generating.
 * @param project The project to build the path for.
 */
export function buildDefaultPath(project: WorkspaceProject): string {
  const root = getProjectRoot(project);
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

export function getProjectConfig(host: Tree, project: WorkspaceProject) {
  const root = getProjectRoot(project);
  const configFile = host.read(root + 'tsconfig.app.json');
  if (!configFile) {
    throw new Error(`Couldn't find project config (tsconfig.app.json).`);
  }
  const configText = configFile.toString('utf-8');
  let config: unknown;
  try {
    config = JSON.parse(configText);
  } catch {
    throw new Error(`Couldn't parse project config (tsconfig.app.json).`);
  }

  return config;
}


// TODO(hans): change this any to unknown when google3 supports TypeScript 3.0.
// tslint:disable-next-line:no-any
export function isWorkspaceSchema(workspace: any): workspace is WorkspaceSchema {
  return !!(workspace && (workspace as WorkspaceSchema).projects);
}

// TODO(hans): change this any to unknown when google3 supports TypeScript 3.0.
// tslint:disable-next-line:no-any
export function isWorkspaceProject(project: any): project is WorkspaceProject {
  return !!(project && (project as WorkspaceProject).projectType);
}

export function isProjectUsingIvy(host: Tree, project: WorkspaceProject) {
  const config = getProjectConfig(host, project) as Partial<{
    angularCompilerOptions: { enableIvy: boolean };
  }>;

  if (config && config.angularCompilerOptions) {
    return !!config.angularCompilerOptions.enableIvy;
  }

  return false;
}
