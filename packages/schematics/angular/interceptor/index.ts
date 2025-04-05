/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Rule } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import type { Schema as InterceptorOptions } from './schema';

export default function (options: InterceptorOptions): Rule {
  const templateFilesDirectory = options.functional ? './functional-files' : './class-files';

  return generateFromFiles({ ...options, templateFilesDirectory });
}
