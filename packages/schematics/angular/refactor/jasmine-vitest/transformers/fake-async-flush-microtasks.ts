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

export function transformFakeAsyncFlushMicrotasks(node: ts.Node, ctx: RefactorContext): ts.Node {
  if (
    !(
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'flushMicrotasks' &&
      isNamedImportFrom(ctx.sourceFile, 'flushMicrotasks', ANGULAR_CORE_TESTING)
    )
  ) {
    return node;
  }

  ctx.reporter.reportTransformation(
    ctx.sourceFile,
    node,
    `Transformed \`flushMicrotasks\` to \`await vi.advanceTimersByTimeAsync(0)\`.`,
  );

  addImportSpecifierRemoval(ctx, 'flushMicrotasks', ANGULAR_CORE_TESTING);

  return ts.factory.createAwaitExpression(
    createViCallExpression(ctx, 'advanceTimersByTimeAsync', [ts.factory.createNumericLiteral(0)]),
  );
}
