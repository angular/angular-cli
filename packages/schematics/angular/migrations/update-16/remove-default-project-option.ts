/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

/** Migration to remove 'defaultProject' option from angular.json. */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    delete workspace.extensions['defaultProject'];
  });
}
