/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Builder, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { execute } from './builder';
import type { Schema as ExtractI18nBuilderOptions } from './schema';

export { ExtractI18nBuilderOptions, execute };

const builder: Builder<ExtractI18nBuilderOptions & json.JsonObject> =
  createBuilder<ExtractI18nBuilderOptions>(execute);

export default builder;
