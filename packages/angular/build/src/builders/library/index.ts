/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Builder, createBuilder } from '@angular-devkit/architect';
import { executeLibraryBuilder } from './builder';
import type { Schema as LibraryBuilderOptions } from './schema';

export { type LibraryBuilderOptions, executeLibraryBuilder, executeLibraryBuilder as execute };

const builder: Builder<LibraryBuilderOptions> = createBuilder(executeLibraryBuilder);

export default builder;
