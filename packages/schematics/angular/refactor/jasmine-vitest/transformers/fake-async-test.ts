/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { isNamedImportFrom } from '../utils/ast-helpers';
import { ANGULAR_CORE_TESTING } from '../utils/constants';
import { RefactorContext } from '../utils/refactor-context';
import { addImportSpecifierRemoval, createViCallExpression } from '../utils/refactor-helpers';

export function transformFakeAsyncTest(
  node: ts.Node,
  ctx: RefactorContext,
  currentOutermostDescribeContext?: CurrentOutermostDescribeContext,
): ts.Node {
  // Transform the outermost describe block and skip others.
  if (currentOutermostDescribeContext == null && _is.describe(node)) {
    return _transformDescribeCall(node, ctx);
  }

  // If we encounter a `fakeAsync` call while in a `describe` block, mark it in the context.
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'fakeAsync' &&
    currentOutermostDescribeContext != null &&
    node.arguments.length >= 1 &&
    _is.arrowOrFunction(node.arguments[0]) &&
    isNamedImportFrom(ctx.sourceFile, 'fakeAsync', ANGULAR_CORE_TESTING)
  ) {
    return _transformFakeAsyncCall(node, ctx, currentOutermostDescribeContext);
  }

  // If we are in a `describe` block, visit the children recursively.
  if (currentOutermostDescribeContext != null) {
    return ts.visitEachChild(
      node,
      (child) => transformFakeAsyncTest(child, ctx, currentOutermostDescribeContext),
      ctx.tsContext,
    );
  }

  return node;
}

function _transformDescribeCall(node: ts.CallExpression, ctx: RefactorContext): ts.CallExpression {
  const currentOutermostDescribeContext: CurrentOutermostDescribeContext = {
    isUsingFakeAsync: false,
  };

  // Visit children recursively to collect transform `fakeAsync usages
  // within the describe block and detect their presence through `isUsingFakeAsync`.
  node = ts.visitEachChild(
    node,
    (child) => transformFakeAsyncTest(child, ctx, currentOutermostDescribeContext),
    ctx.tsContext,
  );

  const { isUsingFakeAsync } = currentOutermostDescribeContext;

  const describeBlock = _findDescribeBlock(node);
  if (!isUsingFakeAsync || describeBlock === undefined) {
    return node;
  }

  addImportSpecifierRemoval(ctx, 'fakeAsync', ANGULAR_CORE_TESTING);

  return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [
    node.arguments[0],
    ts.factory.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.factory.createBlock([
        ..._createFakeTimersHookStatements(ctx),
        ...describeBlock.statements,
      ]),
    ),
    ...node.arguments.slice(2),
  ]);
}

function _transformFakeAsyncCall(
  node: ts.CallExpression,
  ctx: RefactorContext,
  currentOutermostDescribeContext: CurrentOutermostDescribeContext,
): ts.CallExpression | ts.ArrowFunction {
  currentOutermostDescribeContext.isUsingFakeAsync = true;

  const fakeAsyncCallback = node.arguments[0];
  if (!_is.arrowOrFunction(fakeAsyncCallback)) {
    return node;
  }
  const callbackBody = ts.isBlock(fakeAsyncCallback.body)
    ? fakeAsyncCallback.body
    : ts.factory.createBlock([ts.factory.createExpressionStatement(fakeAsyncCallback.body)]);

  ctx.reporter.reportTransformation(
    ctx.sourceFile,
    node,
    `Transformed \`fakeAsync\` to \`vi.useFakeTimers\`.`,
  );

  return ts.factory.createArrowFunction(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    fakeAsyncCallback.typeParameters,
    fakeAsyncCallback.parameters,
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.factory.createBlock(callbackBody.statements),
  );
}

function _createFakeTimersHookStatements(ctx: RefactorContext): ts.Statement[] {
  return [
    // > beforeAll(() => {
    // >   vi.useFakeTimers({
    // >     advanceTimeDelta: 1,
    // >     shouldAdvanceTime: true
    // >   });
    // > });
    ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(ts.factory.createIdentifier('beforeAll'), undefined, [
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.factory.createBlock(
            [
              ts.factory.createExpressionStatement(
                createViCallExpression(ctx, 'useFakeTimers', [
                  ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment(
                      'advanceTimeDelta',
                      ts.factory.createNumericLiteral(1),
                    ),
                    ts.factory.createPropertyAssignment(
                      'shouldAdvanceTime',
                      ts.factory.createTrue(),
                    ),
                  ]),
                ]),
              ),
            ],
            true,
          ),
        ),
      ]),
    ),

    // > afterAll(() => {
    // >   vi.useRealTimers();
    // > });
    ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(ts.factory.createIdentifier('afterAll'), undefined, [
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.factory.createBlock(
            [ts.factory.createExpressionStatement(createViCallExpression(ctx, 'useRealTimers'))],
            true,
          ),
        ),
      ]),
    ),
  ];
}

interface CurrentOutermostDescribeContext {
  isUsingFakeAsync: boolean;
}

function _findDescribeBlock(node: ts.CallExpression): ts.Block | undefined {
  const args = node.arguments;
  const describeCallback = args.length >= 2 ? args[1] : undefined;
  if (describeCallback !== undefined && _is.arrowOrFunction(describeCallback)) {
    return _getFunctionBlock(describeCallback);
  }

  return undefined;
}

function _getFunctionBlock(node: ts.FunctionExpression | ts.ArrowFunction): ts.Block {
  return ts.isBlock(node.body)
    ? node.body
    : ts.factory.createBlock([ts.factory.createExpressionStatement(node.body)]);
}

const _is = {
  arrowOrFunction: (node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression =>
    ts.isArrowFunction(node) || ts.isFunctionExpression(node),
  describe: (node: ts.Node): node is ts.CallExpression =>
    ts.isCallExpression(node) &&
    // describe
    ((ts.isIdentifier(node.expression) && node.expression.text === 'describe') ||
      // describe.only or describe.skip
      (ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'describe')),
};
