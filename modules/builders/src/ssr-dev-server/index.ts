/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuilderOutput,
  createBuilder,
  BuilderContext,
  targetFromTargetString
} from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import {
  Observable,
  from,
  merge,
  zip
} from 'rxjs';
import { Schema } from './schema';
import {
  switchMap,
  map,
  pairwise
} from 'rxjs/operators';

export type SSRDevServerBuilderOptions = Schema & json.JsonObject;

export function execute(
  options: SSRDevServerBuilderOptions,
  context: BuilderContext,
): Observable<BuilderOutput> {

  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);

  const browserTargetRun = from(context.scheduleTarget(browserTarget, {
    watch: true,
    serviceWorker: false,
  }));

  const serverTargetRun = from(context.scheduleTarget(serverTarget, {
    watch: true,
  }));

  return merge(browserTargetRun, serverTargetRun, 1).pipe(
    pairwise(),
    switchMap(([b, s]) => zip(b.output, s.output)),
    map(([b, s]) => ({ success: b.success && s.success }))
  );
}

export default createBuilder<SSRDevServerBuilderOptions, BuilderOutput>(execute);
