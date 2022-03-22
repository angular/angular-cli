/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue, isJsonObject } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

/** Migration to replace 'defaultCollection' option in angular.json. */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    // workspace level
    replaceDefaultCollection(workspace.extensions['cli']);

    // Project level
    for (const project of workspace.projects.values()) {
      replaceDefaultCollection(project.extensions['cli']);
    }
  });
}

function replaceDefaultCollection(cliExtension: JsonValue | undefined): void {
  if (cliExtension && isJsonObject(cliExtension) && cliExtension['defaultCollection']) {
    // If `schematicsCollection` defined `defaultCollection` is ignored hence no need to warn.
    if (!cliExtension['schematicCollections']) {
      cliExtension['schematicCollections'] = [cliExtension['defaultCollection']];
    }

    delete cliExtension['defaultCollection'];
  }
}
