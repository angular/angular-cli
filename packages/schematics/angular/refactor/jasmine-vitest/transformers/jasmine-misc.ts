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

import ts from 'typescript';
import { addVitestValueImport } from '../utils/ast-helpers';
import { getJasmineMethodName, isJasmineCallExpression } from '../utils/ast-validation';
import { addTodoComment } from '../utils/comment-helpers';
import { RefactorContext } from '../utils/refactor-context';
import { createViCallExpression } from '../utils/refactor-helpers';
import { TodoCategory } from '../utils/todo-notes';

export function transformTimerMocks(node: ts.Node, ctx: RefactorContext): ts.Node {
  const { sourceFile, reporter, pendingVitestValueImports } = ctx;
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
    case 'autoTick': {
      const category = 'clockAutoTick';
      reporter.recordTodo(category, sourceFile, node);
      addTodoComment(node, category);

      return node;
    }
    case 'withMock': {
      const category = 'clockWithMock';
      reporter.recordTodo(category, sourceFile, node);
      addTodoComment(node, category);

      return node;
    }
  }

  if (newMethodName) {
    addVitestValueImport(pendingVitestValueImports, 'vi');
    reporter.reportTransformation(
      sourceFile,
      node,
      `Transformed \`jasmine.clock().${pae.name.text}\` to \`vi.${newMethodName}\`.`,
    );
    let newArgs: readonly ts.Expression[] = node.arguments;
    if (newMethodName === 'useFakeTimers') {
      newArgs = [];
    }
    if (newMethodName === 'setSystemTime' && node.arguments.length === 0) {
      newArgs = [
        ts.factory.createNewExpression(ts.factory.createIdentifier('Date'), undefined, []),
      ];
    }

    return createViCallExpression(ctx, newMethodName, newArgs);
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

    const arg = node.expression.arguments[0];
    let throwExpression: ts.Expression;

    if (arg && ts.isNewExpression(arg)) {
      throwExpression = arg;
    } else {
      throwExpression = ts.factory.createNewExpression(
        ts.factory.createIdentifier('Error'),
        undefined,
        arg ? [arg] : [],
      );
    }

    const replacement = ts.factory.createThrowStatement(throwExpression);

    return ts.setOriginalNode(ts.setTextRange(replacement, node), node);
  }

  return node;
}

export function transformJasmineMembers(node: ts.Node, refactorCtx: RefactorContext): ts.Node {
  const { sourceFile, reporter } = refactorCtx;

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression) &&
    node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    const assignment = node.expression;
    if (
      ts.isPropertyAccessExpression(assignment.left) &&
      ts.isIdentifier(assignment.left.expression) &&
      assignment.left.expression.text === 'jasmine'
    ) {
      const memberName = assignment.left.name.text;

      switch (memberName) {
        case 'DEFAULT_TIMEOUT_INTERVAL':
          return transformJasmineDefaultTimeoutInterval(node, assignment.right, refactorCtx);
        case 'MAX_PRETTY_PRINT_ARRAY_LENGTH':
        case 'MAX_PRETTY_PRINT_DEPTH':
        case 'MAX_PRETTY_PRINT_CHARS': {
          const replacement = ts.factory.createEmptyStatement();
          const originalText = node.getFullText().trim();

          reporter.reportTransformation(
            sourceFile,
            node,
            `Removed \`${memberName}\` member assignment.`,
          );
          const category = 'unsupported-jasmine-member';
          reporter.recordTodo(category, sourceFile, node);
          addTodoComment(replacement, category, { name: memberName });
          ts.addSyntheticLeadingComment(
            replacement,
            ts.SyntaxKind.SingleLineCommentTrivia,
            ` ${originalText}`,
            true,
          );

          return replacement;
        }
      }
    }
  }

  return node;
}

function transformJasmineDefaultTimeoutInterval(
  expression: ts.ExpressionStatement,
  timeoutValue: ts.Expression,
  ctx: RefactorContext,
): ts.Node {
  const { sourceFile, reporter, pendingVitestValueImports } = ctx;
  addVitestValueImport(pendingVitestValueImports, 'vi');
  reporter.reportTransformation(
    sourceFile,
    expression,
    'Transformed `jasmine.DEFAULT_TIMEOUT_INTERVAL` to `vi.setConfig()`.',
  );
  const setConfigCall = createViCallExpression(ctx, 'setConfig', [
    ts.factory.createObjectLiteralExpression(
      [ts.factory.createPropertyAssignment('testTimeout', timeoutValue)],
      false,
    ),
  ]);

  return ts.factory.updateExpressionStatement(expression, setConfigCall);
}

const UNSUPPORTED_GLOBAL_FUNCTION_CATEGORIES = new Set<TodoCategory>([
  'setSpecProperty',
  'setSuiteProperty',
  'throwUnless',
  'throwUnlessAsync',
  'getSpecProperty',
]);

// A type guard to ensure that the methodName is one of the categories handled by this transformer.
function isUnsupportedGlobalFunction(
  methodName: string,
): methodName is
  | 'setSpecProperty'
  | 'setSuiteProperty'
  | 'throwUnless'
  | 'throwUnlessAsync'
  | 'getSpecProperty' {
  return UNSUPPORTED_GLOBAL_FUNCTION_CATEGORIES.has(methodName as TodoCategory);
}

export function transformUnsupportedGlobalFunctions(
  node: ts.Node,
  { sourceFile, reporter }: RefactorContext,
): ts.Node {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    isUnsupportedGlobalFunction(node.expression.text)
  ) {
    const functionName = node.expression.text;
    reporter.reportTransformation(
      sourceFile,
      node,
      `Found unsupported global function \`${functionName}\`.`,
    );
    reporter.recordTodo(functionName, sourceFile, node);
    addTodoComment(node, functionName);
  }

  return node;
}

const UNSUPPORTED_JASMINE_CALLS_CATEGORIES = new Set<TodoCategory>([
  'addMatchers',
  'addAsyncMatchers',
  'addCustomEqualityTester',
  'addCustomObjectFormatter',
  'mapContaining',
  'setContaining',
  'addSpyStrategy',
]);

// A type guard to ensure that the methodName is one of the categories handled by this transformer.
function isUnsupportedJasmineCall(
  methodName: string,
): methodName is
  | 'addMatchers'
  | 'addAsyncMatchers'
  | 'addCustomEqualityTester'
  | 'addCustomObjectFormatter'
  | 'mapContaining'
  | 'setContaining'
  | 'addSpyStrategy' {
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
    reporter.recordTodo(methodName, sourceFile, node);
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
  'addSpyStrategy',
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
  'MAX_PRETTY_PRINT_ARRAY_LENGTH',
  'MAX_PRETTY_PRINT_DEPTH',
  'MAX_PRETTY_PRINT_CHARS',
  'addMatchers',
  'addAsyncMatchers',
  'addCustomEqualityTester',
  'addCustomObjectFormatter',
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
      reporter.recordTodo(category, sourceFile, node);
      addTodoComment(node, category, { name: propName });
    }
  }

  return node;
}
