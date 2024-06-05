/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createBuilder } from '@angular-devkit/architect';
import { execute } from './builder';
import { DevServerBuilderOutput } from './output';
import { Schema as DevServerBuilderOptions } from './schema';

export { DevServerBuilderOptions, DevServerBuilderOutput, execute as executeDevServerBuilder };
export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(execute);

// Temporary export to support specs
export { execute as executeDevServer };
