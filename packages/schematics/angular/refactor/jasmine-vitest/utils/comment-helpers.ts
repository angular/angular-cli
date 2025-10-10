/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

export function addTodoComment(node: ts.Node, message: string) {
  let statement: ts.Node = node;

  // Attempt to find the containing statement
  while (statement.parent && !ts.isBlock(statement.parent) && !ts.isSourceFile(statement.parent)) {
    if (ts.isExpressionStatement(statement) || ts.isVariableStatement(statement)) {
      break;
    }
    statement = statement.parent;
  }

  ts.addSyntheticLeadingComment(
    statement,
    ts.SyntaxKind.SingleLineCommentTrivia,
    ` TODO: vitest-migration: ${message}`,
    true,
  );
}
