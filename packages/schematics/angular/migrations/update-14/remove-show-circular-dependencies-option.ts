/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';

/** Migration to remove 'showCircularDependencies' option from browser and server builders. */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const project of workspace.projects.values()) {
      for (const target of project.targets.values()) {
        if (
          target.builder === '@angular-devkit/build-angular:server' ||
          target.builder === '@angular-devkit/build-angular:browser'
        ) {
          for (const [, options] of allTargetOptions(target)) {
            delete options.showCircularDependencies;
          }
        }
      }
    }
  });
}
