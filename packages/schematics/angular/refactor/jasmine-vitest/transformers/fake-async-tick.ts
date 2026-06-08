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

export function transformFakeAsyncTick(node: ts.Node, ctx: RefactorContext): ts.Node {
  if (
    !(
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'tick' &&
      isNamedImportFrom(ctx.sourceFile, 'tick', ANGULAR_CORE_TESTING)
    )
  ) {
    return node;
  }

  ctx.reporter.reportTransformation(
    ctx.sourceFile,
    node,
    `Transformed \`tick\` to \`await vi.advanceTimersByTimeAsync()\`.`,
  );

  addImportSpecifierRemoval(ctx, 'tick', ANGULAR_CORE_TESTING);

  const durationNumericLiteral =
    node.arguments.length > 0 ? node.arguments[0] : ts.factory.createNumericLiteral(0);

  return ts.factory.createAwaitExpression(
    createViCallExpression(ctx, 'advanceTimersByTimeAsync', [durationNumericLiteral]),
  );
}
