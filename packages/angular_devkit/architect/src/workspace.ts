/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject } from '@angular-devkit/core';

export interface Workspace {
  name: string;
  version: number;
  root: string;
  defaultProject?: string;
  projects: { [k: string]: WorkspaceProject };
}

export interface WorkspaceProject {
  projectType: 'application' | 'library';
  root: string;
  defaultTarget?: string;
  targets: { [k: string]: WorkspaceTarget };
}

export interface WorkspaceTarget<TargetOptions = JsonObject> {
  builder: string;
  options: TargetOptions;
  configurations?: { [k: string]: Partial<TargetOptions> };
}
