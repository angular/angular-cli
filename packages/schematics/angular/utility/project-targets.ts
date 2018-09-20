/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { getProject, isWorkspaceProject } from './project';
import { WorkspaceProject, WorkspaceSchema, WorkspaceTargets } from './workspace-models';

export function getProjectTargets(project: WorkspaceProject): WorkspaceTargets;
export function getProjectTargets(
  workspaceOrHost: WorkspaceSchema | Tree,
  projectName: string,
): WorkspaceTargets;
export function getProjectTargets(
  projectOrHost: WorkspaceProject | Tree | WorkspaceSchema,
  projectName = '',
): WorkspaceTargets {
  const project = isWorkspaceProject(projectOrHost)
    ? projectOrHost
    : getProject(projectOrHost, projectName);

  const projectTargets = project.targets || project.architect;
  if (!projectTargets) {
    throw new Error('Project target not found.');
  }

  return projectTargets;
}

export function targetBuildNotFoundError(): SchematicsException {
  return new SchematicsException(`Project target "build" not found.`);
}
