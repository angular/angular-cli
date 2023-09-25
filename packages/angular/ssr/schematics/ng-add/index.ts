/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, externalSchematic } from '@angular-devkit/schematics';
import { Schema as SSROptions } from './schema';

export default function (options: SSROptions): Rule {
  return externalSchematic('@schematics/angular', 'ssr', options);
}
