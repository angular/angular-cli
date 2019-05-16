/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, isPromise } from '@angular-devkit/core';
import { Observable, from, isObservable, of as observableOf, throwError } from 'rxjs';
import { defaultIfEmpty, last, mergeMap, tap } from 'rxjs/operators';
import { Rule, SchematicContext, Source } from '../engine/interface';
import { Tree, TreeSymbol } from '../tree/interface';


function _getTypeOfResult(value?: {}): string {
  if (value === undefined) {
    return 'undefined';
  } else if (value === null) {
    return 'null';
  } else if (typeof value == 'function') {
    return `Function()`;
  } else if (typeof value != 'object') {
    return `${typeof value}(${JSON.stringify(value)})`;
  } else {
    if (Object.getPrototypeOf(value) == Object) {
      return `Object(${JSON.stringify(value)})`;
    } else if (value.constructor) {
      return `Instance of class ${value.constructor.name}`;
    } else {
      return 'Unknown Object';
    }
  }
}


/**
 * When a rule or source returns an invalid value.
 */
export class InvalidRuleResultException extends BaseException {
  constructor(value?: {}) {
    super(`Invalid rule result: ${_getTypeOfResult(value)}.`);
  }
}


export class InvalidSourceResultException extends BaseException {
  constructor(value?: {}) {
    super(`Invalid source result: ${_getTypeOfResult(value)}.`);
  }
}


export function callSource(source: Source, context: SchematicContext): Observable<Tree> {
  const result = source(context);

  if (isObservable(result)) {
    // Only return the last Tree, and make sure it's a Tree.
    return result.pipe(
      defaultIfEmpty(),
      last(),
      tap(inner => {
        if (!inner || !(TreeSymbol in inner)) {
          throw new InvalidSourceResultException(inner);
        }
      }),
    );
  } else if (result && TreeSymbol in result) {
    return observableOf(result);
  } else {
    return throwError(new InvalidSourceResultException(result));
  }
}


export function callRule(
  rule: Rule,
  input: Tree | Observable<Tree>,
  context: SchematicContext,
): Observable<Tree> {
  return (isObservable(input) ? input : observableOf(input)).pipe(mergeMap(inputTree => {
    const result = rule(inputTree, context);

    if (!result) {
      return observableOf(inputTree);
    } else if (typeof result == 'function') {
      // This is considered a Rule, chain the rule and return its output.
      return callRule(result, inputTree, context);
    } else if (isObservable(result)) {
      // Only return the last Tree, and make sure it's a Tree.
      return result.pipe(
        defaultIfEmpty(),
        last(),
        tap(inner => {
          if (!inner || !(TreeSymbol in inner)) {
            throw new InvalidRuleResultException(inner);
          }
        }),
      );
    } else if (isPromise(result)) {
      return from(result).pipe(
        mergeMap(inner => {
          if (typeof inner === 'function') {
            // This is considered a Rule, chain the rule and return its output.
            return callRule(inner, inputTree, context);
          } else {
            return observableOf(inputTree);
          }
        }),
      );
    } else if (TreeSymbol in result) {
      return observableOf(result);
    } else {
      return throwError(new InvalidRuleResultException(result));
    }
  }));
}
