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
  const specialCaseNames = new Set<string>();
  const usedSymbols = new Set<ts.Symbol>();
  const imports = [] as ts.ImportDeclaration[];
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

    if (ts.isIdentifier(node)) {
      const symbol = typeChecker.getSymbolAtLocation(node);
      if (symbol) {
        usedSymbols.add(symbol);
      }
    } else if (ts.isExportSpecifier(node)) {
      // Export specifiers return the non-local symbol from the above
      // so check the name string instead
      specialCaseNames.add((node.propertyName || node.name).text);

      return;
    } else if (ts.isShorthandPropertyAssignment(node)) {
      // Shorthand property assignments return the object property's symbol not the import's
      specialCaseNames.add(node.name.text);
    }

    ts.forEachChild(node, visit);
  });

  if (imports.length === 0) {
    return [];
  }

  const isUnused = (node: ts.Identifier) => {
    if (specialCaseNames.has(node.text)) {
      return false;
    }

    const symbol = typeChecker.getSymbolAtLocation(node);

    return symbol && !usedSymbols.has(symbol);
  };

  for (const node of imports) {
    if (!node.importClause) {
      // "import 'abc';"
      continue;
    }

    if (node.importClause.name) {
      // "import XYZ from 'abc';"
      if (isUnused(node.importClause.name)) {
        ops.push(new RemoveNodeOperation(sourceFile, node));
      }
    } else if (node.importClause.namedBindings
               && ts.isNamespaceImport(node.importClause.namedBindings)) {
      // "import * as XYZ from 'abc';"
      if (isUnused(node.importClause.namedBindings.name)) {
        ops.push(new RemoveNodeOperation(sourceFile, node));
      }
    } else if (node.importClause.namedBindings
               && ts.isNamedImports(node.importClause.namedBindings)) {
      // "import { XYZ, ... } from 'abc';"
      const specifierOps = [];
      for (const specifier of node.importClause.namedBindings.elements) {
        if (isUnused(specifier.propertyName || specifier.name)) {
          specifierOps.push(new RemoveNodeOperation(sourceFile, specifier));
        }
      }

      if (specifierOps.length === node.importClause.namedBindings.elements.length) {
        ops.push(new RemoveNodeOperation(sourceFile, node));
      } else {
        ops.push(...specifierOps);
      }
    }
  }

  return ops;
}
