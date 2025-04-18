/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type Builder, createBuilder } from '@angular-devkit/architect';
import { type UnitTestOptions, execute } from './builder';

export { type UnitTestOptions, execute };

const builder: Builder<UnitTestOptions> = createBuilder(execute);

export default builder;
