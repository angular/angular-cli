/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { Rule, SchematicContext, Source } from '../engine/interface';
import { BaseException } from '../exception/exception';
import { Tree } from '../tree/interface';
import { VirtualTree } from '../tree/virtual';


/**
 * When a rule or source returns an invalid value.
 */
export class InvalidRuleResultException extends BaseException {
  constructor(value: {}) {
    let v = 'Unknown Type';
    if (value === undefined) {
      v = 'undefined';
    } else if (value === null) {
      v = 'null';
    } else if (typeof value == 'function') {
      v = `Function()`;
    } else if (typeof value != 'object') {
      v = `${typeof value}(${JSON.stringify(value)})`;
    } else {
      if (Object.getPrototypeOf(value) == Object) {
        v = `Object(${JSON.stringify(value)})`;
      } else if (value.constructor) {
        v = `Instance of class ${value.constructor.name}`;
      } else {
        v = 'Unknown Object';
      }
    }
    super(`Invalid rule or source result: ${v}.`);
  }
}


export function callSource(source: Source, context: SchematicContext): Observable<Tree> {
  const result = source(context);

  if (result instanceof VirtualTree) {
    return Observable.of(result);
  } else if (result instanceof Observable) {
    return result;
  } else {
    throw new InvalidRuleResultException(result);
  }
}


export function callRule(rule: Rule,
                         input: Observable<Tree>,
                         context: SchematicContext): Observable<Tree> {
  return input.mergeMap(i => {
    const result = rule(i, context);

    if (result instanceof VirtualTree) {
      return Observable.of(result as Tree);
    } else if (result instanceof Observable) {
      return result;
    } else {
      throw new InvalidRuleResultException(result);
    }
  });
}
