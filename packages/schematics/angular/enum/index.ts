/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { Schema as EnumOptions } from './schema';

export default function (options: EnumOptions): Rule {
  options.type = options.type ? `.${options.type}` : '';

  return generateFromFiles(options);
}
