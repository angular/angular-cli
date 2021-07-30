/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const [, project] of workspace.projects) {
      for (const [name, target] of project.targets) {
        // Delete removed tslint builder
        if (target.builder === '@angular-devkit/build-angular:tslint') {
          project.targets.delete(name);
          continue;
        }

        if (!target.builder.startsWith('@angular-devkit/build-angular')) {
          continue;
        }

        // Only interested in Angular Devkit builders
        for (const [, options] of allTargetOptions(target)) {
          delete options.extractCss;
          delete options.servePathDefaultWarning;
          delete options.hmrWarning;
        }
      }
    }
  });
}
