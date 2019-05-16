/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { RemoveNodeOperation, TransformOperation } from './interfaces';


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
): TransformOperation[] {
  const ops: TransformOperation[] = [];

  if (removedNodes.length === 0) {
    return [];
  }

  const typeChecker = getTypeChecker();

  // Collect all imports and used identifiers
  const usedSymbols = new Set<ts.Symbol>();
  const imports: ts.ImportDeclaration[] = [];

  ts.forEachChild(sourceFile, function visit(node) {
    // Skip removed nodes
    if (removedNodes.includes(node)) {
      return;
    }

    // Record import and skip
    if (ts.isImportDeclaration(node)) {
      imports.push(node);

      return;
    }

    let symbol: ts.Symbol | undefined;

    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        symbol = typeChecker.getSymbolAtLocation(node);
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
    return [];
  }

  const isUnused = (node: ts.Identifier) => {
    const symbol = typeChecker.getSymbolAtLocation(node);

    return symbol && !usedSymbols.has(symbol);
  };

  for (const node of imports) {
    if (!node.importClause) {
      // "import 'abc';"
      continue;
    }

    const namedBindings = node.importClause.namedBindings;

    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      // "import * as XYZ from 'abc';"
      if (isUnused(namedBindings.name)) {
        ops.push(new RemoveNodeOperation(sourceFile, node));
      }
    } else {
      const specifierOps = [];
      let clausesCount = 0;

      // "import { XYZ, ... } from 'abc';"
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        let removedClausesCount = 0;
        clausesCount += namedBindings.elements.length;

        for (const specifier of namedBindings.elements) {
          if (isUnused(specifier.name)) {
            removedClausesCount++;
            // in case we don't have any more namedImports we should remove the parent ie the {}
            const nodeToRemove = clausesCount === removedClausesCount
              ? specifier.parent
              : specifier;

            specifierOps.push(new RemoveNodeOperation(sourceFile, nodeToRemove));
          }
        }
      }

      // "import XYZ from 'abc';"
      if (node.importClause.name) {
        clausesCount++;

        if (isUnused(node.importClause.name)) {
          specifierOps.push(new RemoveNodeOperation(sourceFile, node.importClause.name));
        }
      }

      if (specifierOps.length === clausesCount) {
        ops.push(new RemoveNodeOperation(sourceFile, node));
      } else {
        ops.push(...specifierOps);
      }
    }
  }

  return ops;
}
