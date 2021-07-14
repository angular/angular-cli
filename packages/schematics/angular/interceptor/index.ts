/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { Schema as InterceptorOptions } from './schema';

export default function (options: InterceptorOptions): Rule {
  // This schematic uses an older method to implement the flat option
  const flat = options.flat;
  options.flat = true;

  return generateFromFiles(options, {
    'if-flat': (s: string) => (flat ? '' : s),
  });
}
