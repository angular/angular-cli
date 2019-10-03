/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Tree} from '@angular-devkit/schematics/src/tree/interface';
import {workspaces, join, normalize} from '@angular-devkit/core';
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

export async function getDistPaths(host: Tree, clientProjectName: string): Promise<{
  browser: string;
  server: string;
}> {
  // Generate new output paths
  const clientProject = await getProject(host, clientProjectName);
  const clientBuildTarget = clientProject.targets.get('build');
  if (!clientBuildTarget || !clientBuildTarget.options) {
    throw new SchematicsException(`Cannot find 'options' for ${clientProjectName} build target.`);
  }

  const clientBuildOptions = clientBuildTarget.options;
  const clientOutputPath = normalize(
    typeof clientBuildOptions.outputPath === 'string' ? clientBuildOptions.outputPath : 'dist'
  );

  return {
    browser: join(clientOutputPath, 'browser'),
    server: join(clientOutputPath, 'server'),
  };
}
