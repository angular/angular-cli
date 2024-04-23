/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { createBuilder } from '@angular-devkit/architect';
import { execute } from './builder';
import type { Schema as ExtractI18nBuilderOptions } from './schema';

export { ExtractI18nBuilderOptions, execute };
export default createBuilder<ExtractI18nBuilderOptions>(execute);
