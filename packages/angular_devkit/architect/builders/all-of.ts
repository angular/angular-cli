/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { EMPTY, from, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { BuilderOutput, BuilderRun, createBuilder } from '../src';
import { Schema as OperatorSchema } from './operator-schema';

export default createBuilder<json.JsonObject & OperatorSchema>((options, context) => {
  const allRuns: Promise<[number, BuilderRun]>[] = [];

  context.reportProgress(0,
    (options.targets ? options.targets.length : 0)
    + (options.builders ? options.builders.length : 0),
  );

  if (options.targets) {
    allRuns.push(...options.targets.map(({ target: targetStr, overrides }, i) => {
      const [project, target, configuration] = targetStr.split(/:/g, 3);

      return context.scheduleTarget({ project, target, configuration }, overrides || {})
        .then(run => [i, run] as [number, BuilderRun]);
    }));
  }

  if (options.builders) {
    allRuns.push(...options.builders.map(({ builder, options }, i) => {
      return context.scheduleBuilder(builder, options || {})
        .then(run => [i, run] as [number, BuilderRun]);
    }));
  }

  const allResults: (BuilderOutput | null)[] = allRuns.map(() => null);
  let n = 0;
  context.reportProgress(n++, allRuns.length);

  return from(allRuns).pipe(
    mergeMap(runPromise => from(runPromise)),
    mergeMap(([i, run]) => run.output.pipe(map(output => [i, output] as [number, BuilderOutput]))),
    mergeMap(([i, output]) => {
      allResults[i] = output;
      context.reportProgress(n++, allRuns.length);

      if (allResults.some(x => x === null)) {
        // Some builders aren't done running yet.
        return EMPTY;
      } else {
        return of({
          success: allResults.every(x => x ? x.success : false),
        });
      }
    }),
  );
});
