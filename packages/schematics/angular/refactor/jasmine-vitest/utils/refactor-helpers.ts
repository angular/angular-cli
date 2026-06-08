/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { RefactorContext } from './refactor-context';

/**
 * Marks an identifier to be removed from an import specifier.
 *
 * @param ctx The refactor context object.
 * @param name The name of the identifier to remove from the import specifier.
 * @param moduleSpecifier The module specifier to remove the identifier from.
 */
export function addImportSpecifierRemoval(
  ctx: RefactorContext,
  name: string,
  moduleSpecifier: string,
): void {
  const removals = ctx.pendingImportSpecifierRemovals.get(moduleSpecifier) ?? new Set<string>();
  removals.add(name);
  ctx.pendingImportSpecifierRemovals.set(moduleSpecifier, removals);
}

/**
 * Creates a call expression to a vitest method.
 * This also adds the `vi` identifier to the context object,
 * to import it later if addImports option is enabled.
 *
 * @param ctx The refactor context object.
 * @param args The arguments to pass to the method.
 * @param typeArgs The type arguments to pass to the method.
 * @param methodeName The name of the vitest method to call.
 * @returns The created identifier node.
 */
export function createViCallExpression(
  ctx: RefactorContext,
  methodName: string,
  args: readonly ts.Expression[] = [],
  typeArgs: ts.TypeNode[] | undefined = undefined,
): ts.CallExpression {
  const vi = requireVitestIdentifier(ctx, 'vi');
  const callee = ts.factory.createPropertyAccessExpression(vi, methodName);

  return ts.factory.createCallExpression(callee, typeArgs, args);
}

/**
 * Creates an identifier for a vitest value import.
 * This also adds the identifier to the context object,
 * to import it later if addImports option is enabled.
 *
 * @param ctx The refactor context object.
 * @param name The name of the vitest identifier to require.
 * @returns The created identifier node.
 */
export function requireVitestIdentifier(ctx: RefactorContext, name: string): ts.Identifier {
  ctx.pendingVitestValueImports.add(name);

  return ts.factory.createIdentifier(name);
}
