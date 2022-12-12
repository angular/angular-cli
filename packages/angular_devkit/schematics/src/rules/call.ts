/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
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

export async function callSource(source: Source, context: SchematicContext): Promise<Tree> {
  const result = await source(context);

  if (result && TreeSymbol in result) {
    return result;
  }

  throw new InvalidSourceResultException(result);
}

export async function callRule(rule: Rule, tree: Tree, context: SchematicContext): Promise<Tree> {
  let result = await rule(tree, context);

  while (typeof result === 'function') {
    // This is considered a Rule, chain the rule and return its output.
    result = await result(tree, context);
  }

  if (typeof result === 'undefined') {
    return tree;
  }

  if (result && TreeSymbol in result) {
    return result as Tree;
  }

  throw new InvalidRuleResultException(result);
}
