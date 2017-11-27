/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { _throw } from 'rxjs/observable/throw';
import { last } from 'rxjs/operators/last';
import { tap } from 'rxjs/operators/tap';
import { Rule, SchematicContext, Source } from '../engine/interface';
import { Tree, TreeSymbol } from '../tree/interface';


declare const Symbol: Symbol & {
  readonly observable: symbol;
};


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
    return _throw(new InvalidSourceResultException(result));
  } else if (TreeSymbol in result) {
    return Observable.of(result as Tree);
  } else if (Symbol.observable in result) {
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
    return _throw(new InvalidSourceResultException(result));
  }
}


export function callRule(rule: Rule,
                         input: Observable<Tree>,
                         context: SchematicContext): Observable<Tree> {
  return input.mergeMap(inputTree => {
    const result = rule(inputTree, context) as object;

    if (result === undefined) {
      return Observable.of(inputTree);
    } else if (TreeSymbol in result) {
      return Observable.of(result as Tree);
    } else if (Symbol.observable in result) {
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
      return Observable.of(inputTree);
    } else {
      return _throw(new InvalidRuleResultException(result));
    }
  });
}
