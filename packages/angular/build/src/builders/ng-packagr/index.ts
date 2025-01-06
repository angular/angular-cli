/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createBuilder } from '@angular-devkit/architect';
import { execute } from './builder';
import type { Schema as NgPackagrBuilderOptions } from './schema';

export { type NgPackagrBuilderOptions, execute };
export default createBuilder<NgPackagrBuilderOptions>(execute);
