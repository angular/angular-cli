/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicsException } from '@angular-devkit/schematics';
import { ProjectDefinition } from './workspace';
import { Builders } from './workspace-models';

export function targetBuildNotFoundError(): SchematicsException {
  return new SchematicsException(`Project target "build" not found.`);
}

export function isUsingApplicationBuilder(project: ProjectDefinition): boolean {
  const buildBuilder = project.targets.get('build')?.builder;
  const isUsingApplicationBuilder =
    buildBuilder === Builders.Application || buildBuilder === Builders.BuildApplication;

  return isUsingApplicationBuilder;
}

export function isZonelessApp(project: ProjectDefinition): boolean {
  const buildTarget = project.targets.get('build');
  if (!buildTarget?.options?.polyfills) {
    return true;
  }

  const polyfills = buildTarget.options.polyfills as string[] | string;
  const polyfillsList = Array.isArray(polyfills) ? polyfills : [polyfills];

  return !polyfillsList.includes('zone.js');
}
