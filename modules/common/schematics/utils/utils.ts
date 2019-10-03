/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Tree} from '@angular-devkit/schematics/src/tree/interface';
import {workspaces} from '@angular-devkit/core';
import {getWorkspace} from '@schematics/angular/utility/workspace';
import {SchematicsException} from '@angular-devkit/schematics';

export async function getProject(
  host: Tree,
  projectName: string,
): Promise<workspaces.ProjectDefinition> {
  const workspace = await getWorkspace(host);
  const project = workspace.projects.get(projectName);

  if (!project || project.extensions.projectType !== 'application') {
    throw new SchematicsException(`Universal requires a project type of 'application'.`);
  }

  return project;
}

export function stripTsExtension(file: string): string {
  return file.replace(/\.ts$/, '');
}

export async function getOutputPath(
  host: Tree,
  projectName: string,
  target: 'server' | 'build',
): Promise<string> {
  // Generate new output paths
  const project = await getProject(host, projectName);
  const serverTarget = project.targets.get(target);
  if (!serverTarget || !serverTarget.options) {
    throw new SchematicsException
      (`Cannot find 'options' for ${projectName} ${target} target.`);
  }

  const { outputPath } = serverTarget.options;
  if (typeof outputPath !== 'string') {
    throw new SchematicsException
      (`outputPath for ${projectName} ${target} target is not a string.`);
  }

  return outputPath;
}
