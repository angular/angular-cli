/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { from, of } from 'rxjs';
import { concatMap, first, last, map, switchMap } from 'rxjs/operators';
import { BuilderOutput, BuilderRun, createBuilder } from '../src';
import { Schema as OperatorSchema } from './operator-schema';

export default createBuilder<json.JsonObject & OperatorSchema>((options, context) => {
  const allRuns: (() => Promise<BuilderRun>)[] = [];

  context.reportProgress(0,
    (options.targets ? options.targets.length : 0)
    + (options.builders ? options.builders.length : 0),
  );

  if (options.targets) {
    allRuns.push(...options.targets.map(({ target: targetStr, overrides }) => {
      const [project, target, configuration] = targetStr.split(/:/g, 3);

      return () => context.scheduleTarget({ project, target, configuration }, overrides || {});
    }));
  }

  if (options.builders) {
    allRuns.push(...options.builders.map(({ builder, options }) => {
      return () => context.scheduleBuilder(builder, options || {});
    }));
  }

  let stop: BuilderOutput | null = null;
  let i = 0;
  context.reportProgress(i++, allRuns.length);

  return from(allRuns).pipe(
    concatMap(fn => stop ? of(null) : from(fn()).pipe(
      switchMap(run => run === null ? of(null) : run.output.pipe(first())),
    )),
    map(output => {
      context.reportProgress(i++, allRuns.length);
      if (output === null || stop !== null) {
        return stop || { success: false };
      } else if (output.success === false) {
        return stop = output;
      } else {
        return output;
      }
    }),
    last(),
  );
});
