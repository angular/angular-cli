/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { AstHost, Range } from '@angular/compiler-cli/linker';
import { FatalLinkerError } from '@angular/compiler-cli/linker';
import type {
  ArrayExpression,
  ArrowFunctionExpression,
  BooleanLiteral,
  CallExpression,
  Function as FunctionNode,
  Node,
  NullLiteral,
  NumericLiteral,
  ObjectExpression,
  StringLiteral,
  UnaryExpression,
} from '@oxc-project/types';

function isNode(node: unknown): node is Node {
  return typeof node === 'object' && node !== null && 'type' in node;
}

/**
 * An implementation of `AstHost` that queries information from `oxc-parser` AST nodes.
 */
export class OxcAstHost implements AstHost<unknown> {
  getSymbolName(node: unknown): string | null {
    if (!isNode(node)) {
      return null;
    }

    if (node.type === 'Identifier') {
      return node.name;
    } else if (node.type === 'MemberExpression') {
      if (!node.computed && node.property.type === 'Identifier') {
        return node.property.name;
      }
    }

    return null;
  }

  isStringLiteral(node: unknown): node is StringLiteral {
    return isNode(node) && node.type === 'Literal' && typeof node.value === 'string';
  }

  parseStringLiteral(str: unknown): string {
    if (!this.isStringLiteral(str)) {
      throw new FatalLinkerError(str as object, 'Unsupported syntax, expected a string literal.');
    }

    return str.value;
  }

  isNumericLiteral(node: unknown): node is NumericLiteral {
    return isNode(node) && node.type === 'Literal' && typeof node.value === 'number';
  }

  parseNumericLiteral(num: unknown): number {
    if (!this.isNumericLiteral(num)) {
      throw new FatalLinkerError(num as object, 'Unsupported syntax, expected a numeric literal.');
    }

    return num.value;
  }

  isBooleanLiteral(node: unknown): node is BooleanLiteral | UnaryExpression {
    if (!isNode(node)) {
      return false;
    }

    return (
      (node.type === 'Literal' && typeof node.value === 'boolean') || isMinifiedBooleanLiteral(node)
    );
  }

  parseBooleanLiteral(bool: unknown): boolean {
    if (isNode(bool)) {
      if (bool.type === 'Literal' && typeof bool.value === 'boolean') {
        return bool.value;
      }
      if (isMinifiedBooleanLiteral(bool)) {
        return !bool.argument.value;
      }
    }

    throw new FatalLinkerError(bool as object, 'Unsupported syntax, expected a boolean literal.');
  }

  isNull(node: unknown): node is NullLiteral {
    return isNode(node) && node.type === 'Literal' && node.value === null;
  }

  isArrayLiteral(node: unknown): node is ArrayExpression {
    return isNode(node) && node.type === 'ArrayExpression';
  }

  parseArrayLiteral(array: unknown): unknown[] {
    if (!this.isArrayLiteral(array)) {
      throw new FatalLinkerError(array as object, 'Unsupported syntax, expected an array literal.');
    }

    const result: unknown[] = [];

    for (const element of array.elements) {
      if (element === null) {
        throw new FatalLinkerError(
          array as object,
          'Unsupported syntax, element in array not to be empty.',
        );
      }
      if (element.type === 'SpreadElement') {
        throw new FatalLinkerError(
          element as object,
          'Unsupported syntax, element in array not to use spread syntax.',
        );
      }
      result.push(element);
    }

    return result;
  }

  isObjectLiteral(node: unknown): node is ObjectExpression {
    return isNode(node) && node.type === 'ObjectExpression';
  }

  parseObjectLiteral(obj: unknown): Map<string, unknown> {
    if (!this.isObjectLiteral(obj)) {
      throw new FatalLinkerError(obj as object, 'Unsupported syntax, expected an object literal.');
    }

    const result = new Map<string, unknown>();

    for (const property of obj.properties) {
      if (property.type !== 'Property') {
        throw new FatalLinkerError(
          property as object,
          'Unsupported syntax, expected a property assignment.',
        );
      }

      const keyNode = property.key;

      let key: string;
      if (keyNode.type === 'Identifier') {
        key = keyNode.name;
      } else if (this.isStringLiteral(keyNode)) {
        key = keyNode.value;
      } else if (this.isNumericLiteral(keyNode)) {
        key = String(keyNode.value);
      } else {
        throw new FatalLinkerError(
          keyNode as object,
          'Unsupported syntax, expected a property name.',
        );
      }

      result.set(key, property.value);
    }

    return result;
  }

  isFunctionExpression(node: unknown): node is FunctionNode | ArrowFunctionExpression {
    if (!isNode(node)) {
      return false;
    }

    return (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    );
  }

  parseReturnValue(fn: unknown): unknown {
    if (!this.isFunctionExpression(fn)) {
      throw new FatalLinkerError(fn as object, 'Unsupported syntax, expected a function.');
    }

    const body = fn.body;
    if (!body || !isNode(body)) {
      throw new FatalLinkerError(fn as object, 'Unsupported syntax, expected a function body.');
    }

    if (body.type !== 'BlockStatement') {
      return body;
    }

    const statements = body.body;
    if (statements.length !== 1) {
      throw new FatalLinkerError(
        body as object,
        'Unsupported syntax, expected a function body with a single return statement.',
      );
    }

    const stmt = statements[0];
    if (stmt.type !== 'ReturnStatement') {
      throw new FatalLinkerError(
        stmt as object,
        'Unsupported syntax, expected a function body with a single return statement.',
      );
    }

    if (!stmt.argument) {
      throw new FatalLinkerError(
        stmt as object,
        'Unsupported syntax, expected function to return a value.',
      );
    }

    return stmt.argument;
  }

  parseParameters(fn: unknown): unknown[] {
    if (!this.isFunctionExpression(fn)) {
      throw new FatalLinkerError(fn as object, 'Unsupported syntax, expected a function.');
    }

    return fn.params;
  }

  isCallExpression(node: unknown): node is CallExpression {
    return isNode(node) && node.type === 'CallExpression';
  }

  parseCallee(call: unknown): unknown {
    if (!this.isCallExpression(call)) {
      throw new FatalLinkerError(call as object, 'Unsupported syntax, expected a call expression.');
    }

    return call.callee;
  }

  parseArguments(call: unknown): unknown[] {
    if (!this.isCallExpression(call)) {
      throw new FatalLinkerError(call as object, 'Unsupported syntax, expected a call expression.');
    }

    const result: unknown[] = [];

    for (const arg of call.arguments) {
      if (arg.type === 'SpreadElement') {
        throw new FatalLinkerError(
          arg as object,
          'Unsupported syntax, argument not to use spread syntax.',
        );
      }
      result.push(arg);
    }

    return result;
  }

  getRange(node: unknown): Range {
    if (!isNode(node) || typeof node.start !== 'number' || typeof node.end !== 'number') {
      throw new FatalLinkerError(
        node as object,
        'Unable to read range for node - it is missing location information.',
      );
    }

    return {
      startPos: node.start,
      startLine: 0,
      startCol: 0,
      endPos: node.end,
    };
  }
}

function isMinifiedBooleanLiteral(
  node: Node,
): node is UnaryExpression & { argument: NumericLiteral } {
  if (node.type !== 'UnaryExpression') {
    return false;
  }

  const arg = node.argument;

  return (
    node.prefix === true &&
    node.operator === '!' &&
    arg.type === 'Literal' &&
    typeof arg.value === 'number' &&
    (arg.value === 0 || arg.value === 1)
  );
}
