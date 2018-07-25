/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { experimental } from '@angular-devkit/core';

export function getProjectTargets(
  project: experimental.workspace.WorkspaceProject,
): experimental.workspace.WorkspaceTool {
  const projectTargets = project.targets || project.architect;
  if (!projectTargets) {
    throw new Error('Project architect not found.');
  }

  return projectTargets;
}
