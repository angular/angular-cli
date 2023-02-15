/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import { Observable, defaultIfEmpty, defer, isObservable, lastValueFrom, mergeMap } from 'rxjs';
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
  return defer(async () => {
    let result: Tree | Observable<Tree> | undefined = source(context);

    if (isObservable(result)) {
      result = await lastValueFrom(result.pipe(defaultIfEmpty(undefined)));
    }

    if (result && TreeSymbol in result) {
      return result as Tree;
    }

    throw new InvalidSourceResultException(result);
  });
}

export function callRule(
  rule: Rule,
  input: Tree | Observable<Tree>,
  context: SchematicContext,
): Observable<Tree> {
  if (isObservable(input)) {
    return input.pipe(mergeMap((inputTree) => callRuleAsync(rule, inputTree, context)));
  } else {
    return defer(() => callRuleAsync(rule, input, context));
  }
}

async function callRuleAsync(rule: Rule, tree: Tree, context: SchematicContext): Promise<Tree> {
  let result = await rule(tree, context);

  while (typeof result === 'function') {
    // This is considered a Rule, chain the rule and return its output.
    result = await result(tree, context);
  }

  if (typeof result === 'undefined') {
    return tree;
  }

  if (isObservable(result)) {
    result = await lastValueFrom(result.pipe(defaultIfEmpty(tree)));
  }

  if (result && TreeSymbol in result) {
    return result as Tree;
  }

  throw new InvalidRuleResultException(result);
}
