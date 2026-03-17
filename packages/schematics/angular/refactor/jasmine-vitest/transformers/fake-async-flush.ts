/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { isNamedImportFrom } from '../utils/ast-helpers';
import { addTodoComment } from '../utils/comment-helpers';
import { ANGULAR_CORE_TESTING } from '../utils/constants';
import { RefactorContext } from '../utils/refactor-context';
import { addImportSpecifierRemoval, createViCallExpression } from '../utils/refactor-helpers';

export function transformFakeAsyncFlush(node: ts.Node, ctx: RefactorContext): ts.Node {
  if (
    !(
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'flush' &&
      isNamedImportFrom(ctx.sourceFile, 'flush', ANGULAR_CORE_TESTING)
    )
  ) {
    return node;
  }

  ctx.reporter.reportTransformation(
    ctx.sourceFile,
    node,
    `Transformed \`flush\` to \`await vi.runAllTimersAsync()\`.`,
  );

  addImportSpecifierRemoval(ctx, 'flush', ANGULAR_CORE_TESTING);

  if (node.arguments.length > 0) {
    ctx.reporter.recordTodo('flush-max-turns', ctx.sourceFile, node);
    addTodoComment(node, 'flush-max-turns');
  }

  const awaitRunAllTimersAsync = ts.factory.createAwaitExpression(
    createViCallExpression(ctx, 'runAllTimersAsync'),
  );

  if (ts.isExpressionStatement(node.parent)) {
    return awaitRunAllTimersAsync;
  } else {
    // If `flush` is not used as its own statement, then the return value is probably used.
    // Therefore, we replace it with nullish coalescing that returns 0:
    // > await vi.runAllTimersAsync() ?? 0;
    ctx.reporter.recordTodo('flush-return-value', ctx.sourceFile, node);
    addTodoComment(node, 'flush-return-value');

    return ts.factory.createBinaryExpression(
      awaitRunAllTimersAsync,
      ts.SyntaxKind.QuestionQuestionToken,
      ts.factory.createNumericLiteral(0),
    );
  }
}
