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
import { addVitestValueImport, createViCallExpression } from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';
import { TodoCategory } from '../utils/todo-notes';

export function transformTimerMocks(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestValueImports }: RefactorContext,
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
    addVitestValueImport(pendingVitestValueImports, 'vi');
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

    const replacement = ts.factory.createThrowStatement(
      ts.factory.createNewExpression(
        ts.factory.createIdentifier('Error'),
        undefined,
        reason ? [reason] : [],
      ),
    );

    return ts.setOriginalNode(ts.setTextRange(replacement, node), node);
  }

  return node;
}

export function transformDefaultTimeoutInterval(
  node: ts.Node,
  { sourceFile, reporter, pendingVitestValueImports }: RefactorContext,
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
      addVitestValueImport(pendingVitestValueImports, 'vi');
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

      return ts.factory.updateExpressionStatement(node, setConfigCall);
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
    const category = 'unsupported-global-function';
    reporter.recordTodo(category);
    addTodoComment(node, category, { name: functionName });
  }

  return node;
}

const UNSUPPORTED_JASMINE_CALLS_CATEGORIES = new Set<TodoCategory>([
  'addMatchers',
  'addCustomEqualityTester',
  'mapContaining',
  'setContaining',
]);

// A type guard to ensure that the methodName is one of the categories handled by this transformer.
function isUnsupportedJasmineCall(
  methodName: string,
): methodName is 'addMatchers' | 'addCustomEqualityTester' | 'mapContaining' | 'setContaining' {
  return UNSUPPORTED_JASMINE_CALLS_CATEGORIES.has(methodName as TodoCategory);
}

export function transformUnsupportedJasmineCalls(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  const methodName = getJasmineMethodName(node);

  if (methodName && isUnsupportedJasmineCall(methodName)) {
    reporter.reportTransformation(
      sourceFile,
      node,
      `Found unsupported call \`jasmine.${methodName}\`.`,
    );
    reporter.recordTodo(methodName);
    addTodoComment(node, methodName);
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
      const category = 'unknown-jasmine-property';
      reporter.recordTodo(category);
      addTodoComment(node, category, { name: propName });
    }
  }

  return node;
}
