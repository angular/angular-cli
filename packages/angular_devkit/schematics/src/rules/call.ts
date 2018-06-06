/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, isObservable } from '@angular-devkit/core';
import { Observable, of as observableOf, throwError } from 'rxjs';
import { last, mergeMap, tap } from 'rxjs/operators';
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
  const result = source(context) as object;

  if (result === undefined) {
    return throwError(new InvalidSourceResultException(result));
  } else if (TreeSymbol in result) {
    return observableOf(result as Tree);
  } else if (isObservable(result)) {
    // Only return the last Tree, and make sure it's a Tree.
    return (result as Observable<Tree>).pipe(
      last(),
      tap(inner => {
        if (!(TreeSymbol in inner)) {
          throw new InvalidSourceResultException(inner);
        }
      }),
    );
  } else {
    return throwError(new InvalidSourceResultException(result));
  }
}


export function callRule(rule: Rule,
                         input: Observable<Tree>,
                         context: SchematicContext): Observable<Tree> {
  return input.pipe(mergeMap(inputTree => {
    const result = rule(inputTree, context) as object;

    if (result === undefined) {
      return observableOf(inputTree);
    } else if (TreeSymbol in result) {
      return observableOf(result as Tree);
    } else if (typeof result == 'function') {
      // This is considered a Rule, chain the rule and return its output.
      return callRule(result, input, context);
    } else if (isObservable(result)) {
      const obs = result as Observable<Tree>;

      // Only return the last Tree, and make sure it's a Tree.
      return obs.pipe(
        last(),
        tap(inner => {
          if (!(TreeSymbol in inner)) {
            throw new InvalidRuleResultException(inner);
          }
        }),
      );
    } else if (result === undefined) {
      return observableOf(inputTree);
    } else {
      return throwError(new InvalidRuleResultException(result));
    }
  }));
}
