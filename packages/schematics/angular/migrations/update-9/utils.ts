/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonAstObject, experimental } from '@angular-devkit/core';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders, WorkspaceTargets } from '../../utility/workspace-models';

/** Get all workspace targets which builder and target names matches the provided. */
export function getTargets(
  workspace: JsonAstObject | experimental.workspace.WorkspaceSchema,
  targetName: Exclude<keyof WorkspaceTargets, number>,
  builderName: Builders,
): { target: JsonAstObject, project: JsonAstObject }[] {
  const projects = findPropertyInAstObject(workspace as JsonAstObject, 'projects');
  if (!projects || projects.kind !== 'object') {
    return [];
  }

  const targets = [];
  for (const project of projects.properties) {
    const projectConfig = project.value;
    if (projectConfig.kind !== 'object') {
      continue;
    }

    const projectRoot = findPropertyInAstObject(projectConfig, 'root');
    if (!projectRoot || projectRoot.kind !== 'string') {
      continue;
    }

    const architect = findPropertyInAstObject(projectConfig, 'architect');
    if (!architect || architect.kind !== 'object') {
      continue;
    }

    const target = findPropertyInAstObject(architect, targetName);
    if (!target || target.kind !== 'object') {
      continue;
    }

    const builder = findPropertyInAstObject(target, 'builder');
    // Projects who's build builder is @angular-devkit/build-ng-packagr
    if (builder && builder.kind === 'string' && builder.value === builderName) {
      targets.push({ target, project: projectConfig });
    }
  }

  return targets;
}
