/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { TODO_NOTES, TodoCategory, TodoContextMap } from './todo-notes';

// A helper type to find all `TodoCategory` keys that do not require a context.
type CategoriesWithNoContext = {
  [K in TodoCategory]: TodoContextMap[K] extends never ? K : never;
}[TodoCategory];

/**
 * Adds a TODO comment to a TypeScript node for manual migration.
 * This overload handles categories that do not require a context object.
 * @param node The AST node to which the comment will be added.
 * @param category The category of the TODO, used to look up the message and URL.
 */
export function addTodoComment<T extends CategoriesWithNoContext>(node: ts.Node, category: T): void;

/**
 * Adds a TODO comment to a TypeScript node for manual migration.
 * This overload handles categories that require a context object, ensuring it is
 * provided and correctly typed.
 * @param node The AST node to which the comment will be added.
 * @param category The category of the TODO, used to look up the message and URL.
 * @param context The context object providing dynamic values for the message.
 */
export function addTodoComment<T extends TodoCategory>(
  node: ts.Node,
  category: T,
  context: TodoContextMap[T],
): void;

// Implementation that covers both overloads.
export function addTodoComment(
  node: ts.Node,
  category: TodoCategory,
  context?: Record<string, unknown>,
): void {
  const note = TODO_NOTES[category];
  // The type assertion is safe here because the overloads guarantee the correct context is passed.
  const message =
    typeof note.message === 'function' ? note.message(context as never) : note.message;
  const url = 'url' in note && note.url ? ` See: ${note.url}` : '';
  const commentText = ` TODO: vitest-migration: ${message}${url}`;

  let statement: ts.Node = node;

  // Traverse up the AST to find the containing statement for the node.
  // This ensures that the comment is placed before the entire statement,
  // rather than being attached to a deeply nested node. For example, if the
  // node is an `Identifier`, we want the comment on the `VariableStatement`
  // or `ExpressionStatement` that contains it.
  while (statement.parent && !ts.isBlock(statement.parent) && !ts.isSourceFile(statement.parent)) {
    if (ts.isExpressionStatement(statement) || ts.isVariableStatement(statement)) {
      break;
    }
    statement = statement.parent;
  }

  ts.addSyntheticLeadingComment(
    statement,
    ts.SyntaxKind.SingleLineCommentTrivia,
    commentText,
    true,
  );
}
