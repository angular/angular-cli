/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains transformers for miscellaneous Jasmine APIs that don't
 * fit into other categories. This includes timer mocks (`jasmine.clock`), the `fail()`
 * function, and configuration settings like `jasmine.DEFAULT_TIMEOUT_INTERVAL`. It also
 * includes logic to identify and add TODO comments for unsupported Jasmine features.
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { createViCallExpression } from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';

export function transformTimerMocks(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ts.isIdentifier(node.expression.name)
  ) {
    return node;
  }

  const pae = node.expression;
  const clockCall = pae.expression;
  if (!isJasmineCallExpression(clockCall, 'clock')) {
    return node;
  }

  let newMethodName: string | undefined;
  switch (pae.name.text) {
    case 'install':
      newMethodName = 'useFakeTimers';
      break;
    case 'tick':
      newMethodName = 'advanceTimersByTime';
      break;
    case 'uninstall':
      newMethodName = 'useRealTimers';
      break;
    case 'mockDate':
      newMethodName = 'setSystemTime';
      break;
  }

  if (newMethodName) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`jasmine.clock().${pae.name.text}\` to \`vi.${newMethodName}\`.`,
    );
    const newArgs = newMethodName === 'useFakeTimers' ? [] : node.arguments;

    return createViCallExpression(newMethodName, newArgs);
  }

  return node;
}

export function transformFail(node: ts.Node, { sourceFile, reporter }: RefactorContext): ts.Node {
  if (
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'fail'
  ) {
    reporter.reportTransformation(sourceFile, node, 'Transformed `fail()` to `throw new Error()`.');
    const reason = node.expression.arguments[0];

    return ts.factory.createThrowStatement(
      ts.factory.createNewExpression(
        ts.factory.createIdentifier('Error'),
        undefined,
        reason ? [reason] : [],
      ),
    );
  }

  return node;
}

export function transformDefaultTimeoutInterval(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression) &&
    node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    const assignment = node.expression;
    if (
      ts.isPropertyAccessExpression(assignment.left) &&
      ts.isIdentifier(assignment.left.expression) &&
      assignment.left.expression.text === 'jasmine' &&
      assignment.left.name.text === 'DEFAULT_TIMEOUT_INTERVAL'
    ) {
      reporter.reportTransformation(
        sourceFile,
        node,
        'Transformed `jasmine.DEFAULT_TIMEOUT_INTERVAL` to `vi.setConfig()`.',
      );
      const timeoutValue = assignment.right;
      const setConfigCall = createViCallExpression('setConfig', [
        ts.factory.createObjectLiteralExpression(
          [ts.factory.createPropertyAssignment('testTimeout', timeoutValue)],
          false,
        ),
      ]);

      return ts.factory.createExpressionStatement(setConfigCall);
    }
  }

  return node;
}

export function transformGlobalFunctions(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'setSpecProperty' || node.expression.text === 'setSuiteProperty')
  ) {
    const functionName = node.expression.text;
    reporter.reportTransformation(
      sourceFile,
      node,
      `Found unsupported global function \`${functionName}\`.`,
    );
    reporter.recordTodo(functionName);
    addTodoComment(
      node,
      `Unsupported global function \`${functionName}\` found. This function is used for custom reporters in Jasmine ` +
        'and has no direct equivalent in Vitest.',
    );
  }

  return node;
}

const JASMINE_UNSUPPORTED_CALLS = new Map<string, string>([
  [
    'addMatchers',
    'jasmine.addMatchers is not supported. Please manually migrate to expect.extend().',
  ],
  [
    'addCustomEqualityTester',
    'jasmine.addCustomEqualityTester is not supported. Please manually migrate to expect.addEqualityTesters().',
  ],
  [
    'mapContaining',
    'jasmine.mapContaining is not supported. Vitest does not have a built-in matcher for Maps.' +
      ' Please manually assert the contents of the Map.',
  ],
  [
    'setContaining',
    'jasmine.setContaining is not supported. Vitest does not have a built-in matcher for Sets.' +
      ' Please manually assert the contents of the Set.',
  ],
]);

export function transformUnsupportedJasmineCalls(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  const methodName = getJasmineMethodName(node);
  if (!methodName) {
    return node;
  }

  const message = JASMINE_UNSUPPORTED_CALLS.get(methodName);
  if (message) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Found unsupported call \`jasmine.${methodName}\`.`,
    );
    reporter.recordTodo(methodName);
    addTodoComment(node, message);
  }

  return node;
}

// If any additional properties are added to transforms, they should also be added to this list.
const HANDLED_JASMINE_PROPERTIES = new Set([
  // Spies
  'createSpy',
  'createSpyObj',
  'spyOnAllFunctions',
  // Clock
  'clock',
  // Matchers
  'any',
  'anything',
  'stringMatching',
  'objectContaining',
  'arrayContaining',
  'arrayWithExactContents',
  'truthy',
  'falsy',
  'empty',
  'notEmpty',
  'mapContaining',
  'setContaining',
  // Other
  'DEFAULT_TIMEOUT_INTERVAL',
  'addMatchers',
  'addCustomEqualityTester',
]);

export function transformUnknownJasmineProperties(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'jasmine'
  ) {
    const propName = node.name.text;
    if (!HANDLED_JASMINE_PROPERTIES.has(propName)) {
      reporter.reportTransformation(
        sourceFile,
        node,
        `Found unknown jasmine property \`jasmine.${propName}\`.`,
      );
      reporter.recordTodo(`unknown-jasmine-property: ${propName}`);
      addTodoComment(
        node,
        `Unsupported jasmine property "${propName}" found. Please migrate this manually.`,
      );
    }
  }

  return node;
}
