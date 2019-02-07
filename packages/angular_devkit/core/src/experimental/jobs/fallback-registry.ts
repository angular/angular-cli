/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, from, of } from 'rxjs';
import { concatMap, first } from 'rxjs/operators';
import { JsonValue, schema } from '../../json';
import { JobDescription, JobHandler, JobName, Registry, isJobHandler } from './api';
import { JobNameAlreadyRegisteredException } from './exception';


/**
 * A simple job registry that keep a map of JobName => JobHandler internally.
 */
export class FallbackRegistry<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> implements Registry<MinimumArgumentValueT, MinimumInputValueT, MinimumOutputValueT> {
  constructor(protected _fallbacks: Registry<
    MinimumArgumentValueT,
    MinimumInputValueT,
    MinimumOutputValueT
  >[] = []) {}

  addFallback(registry: Registry) {
    this._fallbacks.push(registry);
  }

  get<
    A extends MinimumArgumentValueT = MinimumArgumentValueT,
    I extends MinimumInputValueT = MinimumInputValueT,
    O extends MinimumOutputValueT = MinimumOutputValueT,
  >(name: JobName): Observable<JobHandler<A, I, O> | null> {
    return from(this._fallbacks).pipe(
      concatMap(fb => fb.get<A, I, O>(name)),
      first(x => x !== null, null),
    );
  }
}
