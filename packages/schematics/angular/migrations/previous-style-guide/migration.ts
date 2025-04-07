/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

const TYPE_SCHEMATICS = ['component', 'directive', 'service'] as const;

const SEPARATOR_SCHEMATICS = ['guard', 'interceptor', 'module', 'pipe', 'resolver'] as const;

export default function (): Rule {
  return updateWorkspace((workspace) => {
    let schematicsDefaults = workspace.extensions['schematics'];

    // Ensure "schematics" field is an object
    if (
      !schematicsDefaults ||
      typeof schematicsDefaults !== 'object' ||
      Array.isArray(schematicsDefaults)
    ) {
      schematicsDefaults = workspace.extensions['schematics'] = {};
    }

    // Add "type" value for each schematic to continue generating a type suffix.
    // New default is an empty type value.
    for (const schematicName of TYPE_SCHEMATICS) {
      const schematic = (schematicsDefaults[`@schematics/angular:${schematicName}`] ??= {});
      if (typeof schematic === 'object' && !Array.isArray(schematic) && !('type' in schematic)) {
        schematic['type'] = schematicName;
      }
    }

    // Add "typeSeparator" value for each schematic to continue generating "." before type.
    // New default is an "-" type value.
    for (const schematicName of SEPARATOR_SCHEMATICS) {
      const schematic = (schematicsDefaults[`@schematics/angular:${schematicName}`] ??= {});
      if (
        typeof schematic === 'object' &&
        !Array.isArray(schematic) &&
        !('typeSeparator' in schematic)
      ) {
        schematic['typeSeparator'] = '.';
      }
    }
  });
}
