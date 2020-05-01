/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicsException } from '@angular-devkit/schematics';

export function targetBuildNotFoundError(): SchematicsException {
  return new SchematicsException(`Project target "build" not found.`);
}
