/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as ts from 'typescript';

// Remove imports for which all identifiers have been removed.
// Needs type checker, and works even if it's not the first transformer.
// Works by removing imports for symbols whose identifiers have all been removed.
// Doesn't use the `symbol.declarations` because that previous transforms might have removed nodes
// but the type checker doesn't know.
// See https://github.com/Microsoft/TypeScript/issues/17552 for more information.
export function elideImports(
  sourceFile: ts.SourceFile,
  removedNodes: ts.Node[],
  getTypeChecker: () => ts.TypeChecker,
  compilerOptions: ts.CompilerOptions,
): Set<ts.Node> {
  const importNodeRemovals = new Set<ts.Node>();

  if (removedNodes.length === 0) {
    return importNodeRemovals;
  }

  const typeChecker = getTypeChecker();

  // Collect all imports and used identifiers
  const usedSymbols = new Set<ts.Symbol>();
  const imports: ts.ImportDeclaration[] = [];

  ts.forEachChild(sourceFile, function visit(node) {
    // Skip removed nodes.
    if (removedNodes.includes(node)) {
      return;
    }

    // Consider types for 'implements' as unused.
    // A HeritageClause token can also be an 'AbstractKeyword'
    // which in that case we should not elide the import.
    if (ts.isHeritageClause(node) && node.token === ts.SyntaxKind.ImplementsKeyword) {
      return;
    }

    // Record import and skip
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause?.isTypeOnly) {
        imports.push(node);
      }

      return;
    }

    // Type nodes do not need to be emitted when `emitDecoratorMetadata` is disabled.
    // `ExpressionWithTypeArguments` is excluded as it also represents runtime values such as
    // `class ... extends Base<T>` heritage clauses and instantiation expressions (`Map<string, T>`).
    if (
      ts.isTypeNode(node) &&
      !ts.isExpressionWithTypeArguments(node) &&
      !compilerOptions.emitDecoratorMetadata
    ) {
      return;
    }

    // Pure type declarations, type queries, ambient statements, external re-exports,
    // and type-only exports are erased or do not reference local imports at runtime.
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isTypeParameterDeclaration(node) ||
      ts.isTypeQueryNode(node) ||
      ts.isImportTypeNode(node) ||
      ts.isIndexSignatureDeclaration(node) ||
      (ts.isStatement(node) &&
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) ||
      (ts.isExportDeclaration(node) && (node.isTypeOnly || node.moduleSpecifier !== undefined)) ||
      (ts.isExportSpecifier(node) && node.isTypeOnly)
    ) {
      return;
    }

    let symbol: ts.Symbol | undefined;
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        if (node.parent && ts.isShorthandPropertyAssignment(node.parent)) {
          const shorthandSymbol = typeChecker.getShorthandAssignmentValueSymbol(node.parent);
          if (shorthandSymbol) {
            symbol = shorthandSymbol;
          }
        } else {
          symbol = typeChecker.getSymbolAtLocation(node);
        }
        break;
      case ts.SyntaxKind.ExportSpecifier:
        symbol = typeChecker.getExportSpecifierLocalTargetSymbol(node as ts.ExportSpecifier);
        break;
      case ts.SyntaxKind.ShorthandPropertyAssignment:
        symbol = typeChecker.getShorthandAssignmentValueSymbol(node);
        break;
    }

    if (symbol) {
      usedSymbols.add(symbol);
    }

    ts.forEachChild(node, visit);
  });

  if (imports.length === 0) {
    return importNodeRemovals;
  }

  /**
   * Determines how an imported binding should be handled:
   * - `keep`: the binding is still referenced.
   * - `value`: the binding is a runtime value that is no longer referenced.
   * - `type`: the binding does not exist at runtime and is always elided by TypeScript.
   */
  const getRemovalKind = (node: ts.Identifier): 'keep' | 'value' | 'type' => {
    // Do not remove JSX factory imports
    if (node.text === compilerOptions.jsxFactory) {
      return 'keep';
    }

    const symbol = typeChecker.getSymbolAtLocation(node);
    if (!symbol) {
      return 'keep';
    }

    // Note: with `verbatimModuleSyntax`, TypeScript reports an error for imports of non-value aliases
    // that do not use a `type` modifier (TS1484/TS1485), so no special handling is needed for it.
    if ((symbol.flags & ts.SymbolFlags.Alias) !== 0 && !isValueAlias(symbol, typeChecker)) {
      return 'type';
    }

    return usedSymbols.has(symbol) ? 'keep' : 'value';
  };

  for (const node of imports) {
    if (!node.importClause) {
      // "import 'abc';"
      continue;
    }

    const namedBindings = node.importClause.namedBindings;

    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      // "import * as XYZ from 'abc';"
      if (getRemovalKind(namedBindings.name) !== 'keep') {
        importNodeRemovals.add(node);
      }
    } else {
      const specifierNodeRemovals = [];
      let clausesCount = 0;
      // TypeScript skips its own import elision for declarations replaced by a transformer.
      // A declaration is therefore only partially rewritten when a runtime value import must be
      // removed, or when it was already replaced by a previous transformer. Otherwise, it is left
      // untouched so that TypeScript continues to elide any type-only specifiers itself.
      let requiresRewrite = !ts.isParseTreeNode(node);

      // "import { XYZ, ... } from 'abc';"
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        let removedClausesCount = 0;
        clausesCount += namedBindings.elements.length;

        for (const specifier of namedBindings.elements) {
          const removalKind = specifier.isTypeOnly ? 'type' : getRemovalKind(specifier.name);
          if (removalKind !== 'keep') {
            requiresRewrite ||= removalKind === 'value';
            removedClausesCount++;
            // in case we don't have any more namedImports we should remove the parent ie the {}
            const nodeToRemove =
              clausesCount === removedClausesCount ? specifier.parent : specifier;

            specifierNodeRemovals.push(nodeToRemove);
          }
        }
      }

      // "import XYZ from 'abc';"
      if (node.importClause.name) {
        clausesCount++;

        const removalKind = node.importClause.isTypeOnly
          ? 'type'
          : getRemovalKind(node.importClause.name);
        if (removalKind !== 'keep') {
          requiresRewrite ||= removalKind === 'value';
          specifierNodeRemovals.push(node.importClause.name);
        }
      }

      if (specifierNodeRemovals.length === clausesCount) {
        importNodeRemovals.add(node);
      } else if (requiresRewrite) {
        for (const specifierNodeRemoval of specifierNodeRemovals) {
          importNodeRemovals.add(specifierNodeRemoval);
        }
      }
    }
  }

  return importNodeRemovals;
}

/**
 * Determines whether an import alias resolves to a runtime value. Aliases that only resolve to
 * types, or that pass through a type-only import or export declaration anywhere along the alias
 * chain, are always elided by TypeScript.
 */
function isValueAlias(symbol: ts.Symbol, typeChecker: ts.TypeChecker): boolean {
  const seen = new Set<ts.Symbol>();
  let current = symbol;

  while ((current.flags & ts.SymbolFlags.Alias) !== 0) {
    if (seen.has(current)) {
      // Circular alias (a TypeScript error) — assume runtime value so we don't over-elide.
      return true;
    }
    seen.add(current);

    if (
      current.declarations?.length &&
      current.declarations.every(ts.isTypeOnlyImportOrExportDeclaration)
    ) {
      return false;
    }

    const next = typeChecker.getImmediateAliasedSymbol(current);
    if (!next) {
      // Unresolved alias (e.g., missing module) — assume runtime value so we don't over-elide.
      return true;
    }
    current = next;
  }

  return (current.flags & ts.SymbolFlags.Value) !== 0;
}
