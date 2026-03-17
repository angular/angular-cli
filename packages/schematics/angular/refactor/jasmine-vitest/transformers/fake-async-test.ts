/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { isNamedImportFrom } from '../utils/ast-helpers';
import { ANGULAR_CORE_TESTING } from '../utils/constants';
import { RefactorContext } from '../utils/refactor-context';
import {
  addImportSpecifierRemoval,
  createViCallExpression,
  requireVitestIdentifier,
} from '../utils/refactor-helpers';

export function transformFakeAsyncTest(node: ts.Node, ctx: RefactorContext): ts.Node {
  if (
    !(
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fakeAsync' &&
      node.arguments.length >= 1 &&
      (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0])) &&
      isNamedImportFrom(ctx.sourceFile, 'fakeAsync', ANGULAR_CORE_TESTING)
    )
  ) {
    return node;
  }

  ctx.reporter.reportTransformation(
    ctx.sourceFile,
    node,
    `Transformed \`fakeAsync\` to \`vi.useFakeTimers\`.`,
  );

  addImportSpecifierRemoval(ctx, 'fakeAsync', ANGULAR_CORE_TESTING);

  const callback = node.arguments[0];
  const callbackBody = ts.isBlock(callback.body)
    ? callback.body
    : ts.factory.createBlock([ts.factory.createExpressionStatement(callback.body)]);

  const onTestFinished = requireVitestIdentifier(ctx, 'onTestFinished');

  // Generate the following code:
  // > vi.useFakeTimers();
  // > onTestFinished(() => {
  // >  vi.useRealTimers();
  // > });
  const setupStatements: ts.Statement[] = [
    ts.factory.createExpressionStatement(createViCallExpression(ctx, 'useFakeTimers')),
    ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(onTestFinished, undefined, [
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.factory.createBlock([
            ts.factory.createExpressionStatement(createViCallExpression(ctx, 'useRealTimers')),
          ]),
        ),
      ]),
    ),
    ...callbackBody.statements,
  ];

  return ts.factory.createArrowFunction(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    undefined,
    [],
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.factory.createBlock(setupStatements),
  );
}
