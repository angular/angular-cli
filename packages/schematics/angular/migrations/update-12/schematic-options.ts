/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    // Update root level schematics options if present
    const rootSchematics = workspace.extensions.schematics;
    if (rootSchematics && json.isJsonObject(rootSchematics)) {
      updateSchematicsField(rootSchematics);
    }

    // Update project level schematics options if present
    for (const [, project] of workspace.projects) {
      const projectSchematics = project.extensions.schematics;
      if (projectSchematics && json.isJsonObject(projectSchematics)) {
        updateSchematicsField(projectSchematics);
      }
    }
  });
}

function updateSchematicsField(schematics: json.JsonObject): void {
  for (const [schematicName, schematicOptions] of Object.entries(schematics)) {
    if (!json.isJsonObject(schematicOptions)) {
      continue;
    }

    if (schematicName === '@schematics/angular:module') {
      delete schematicOptions.skipTests;
    }
  }
}
