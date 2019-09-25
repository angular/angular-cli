/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderOutput, createBuilder, BuilderContext } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { Schema } from './schema';

export type SSRDevServerBuilderOptions = Schema & json.JsonObject;

export function execute(
  _options: SSRDevServerBuilderOptions,
  _context: BuilderContext,
): Observable<BuilderOutput> {
  return of({ success: true });
}

export default createBuilder<SSRDevServerBuilderOptions, BuilderOutput>(execute);
