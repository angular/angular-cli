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
import type { Schema as NgPackagrBuilderOptions } from './schema';

export { type NgPackagrBuilderOptions, execute };

const builder: Builder<NgPackagrBuilderOptions & json.JsonObject> =
  createBuilder<NgPackagrBuilderOptions>(execute);

export default builder;
