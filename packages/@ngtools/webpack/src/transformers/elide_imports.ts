// @ignoreDep typescript
import * as ts from 'typescript';

import { collectDeepNodes } from './ast_helpers';
import { RemoveNodeOperation, TransformOperation } from './interfaces';


interface RemovedSymbol {
  symbol: ts.Symbol;
  importDecl: ts.ImportDeclaration;
  importSpec: ts.ImportSpecifier;
  singleImport: boolean;
  removed: ts.Identifier[];
  all: ts.Identifier[];
}

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

  // Get all children identifiers inside the removed nodes.
  const removedIdentifiers = removedNodes
    .map((node) => collectDeepNodes<ts.Identifier>(node, ts.SyntaxKind.Identifier))
    .reduce((prev, curr) => prev.concat(curr), [])
    // Also add the top level nodes themselves if they are identifiers.
    .concat(removedNodes.filter((node) =>
      node.kind === ts.SyntaxKind.Identifier) as ts.Identifier[]);

  if (removedIdentifiers.length === 0) {
    return [];
  }

  // Get all imports in the source file.
  const allImports = collectDeepNodes<ts.ImportDeclaration>(
    sourceFile, ts.SyntaxKind.ImportDeclaration);

  if (allImports.length === 0) {
    return [];
  }

  const removedSymbolMap: Map<string, RemovedSymbol> = new Map();
  const typeChecker = getTypeChecker();

  // Find all imports that use a removed identifier and add them to the map.
  allImports
    .filter((node: ts.ImportDeclaration) => {
      // TODO: try to support removing `import * as X from 'XYZ'`.
      // Filter out import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
      const clause = node.importClause as ts.ImportClause;
      if (!clause || clause.name || !clause.namedBindings) {
        return false;
      }
      return clause.namedBindings.kind == ts.SyntaxKind.NamedImports;
    })
    .forEach((importDecl: ts.ImportDeclaration) => {
      const importClause = importDecl.importClause as ts.ImportClause;
      const namedImports = importClause.namedBindings as ts.NamedImports;

      namedImports.elements.forEach((importSpec: ts.ImportSpecifier) => {
        const importId = importSpec.name;
        const symbol = typeChecker.getSymbolAtLocation(importId);

        const removedNodesForImportId = removedIdentifiers.filter((id) =>
          id.text === importId.text && typeChecker.getSymbolAtLocation(id) === symbol);

        if (removedNodesForImportId.length > 0) {
          removedSymbolMap.set(importId.text, {
            symbol,
            importDecl,
            importSpec,
            singleImport: namedImports.elements.length === 1,
            removed: removedNodesForImportId,
            all: []
          });
        }
      });
    });


  if (removedSymbolMap.size === 0) {
    return [];
  }

  // Find all identifiers in the source file that have a removed symbol, and add them to the map.
  collectDeepNodes<ts.Identifier>(sourceFile, ts.SyntaxKind.Identifier)
    .forEach((id) => {
      if (removedSymbolMap.has(id.text)) {
        const symbol = removedSymbolMap.get(id.text);
        if (typeChecker.getSymbolAtLocation(id) === symbol.symbol) {
          symbol.all.push(id);
        }
      }
    });

  Array.from(removedSymbolMap.values())
    .filter((symbol) => {
      // If the number of removed imports plus one (the import specifier) is equal to the total
      // number of identifiers for that symbol, it's safe to remove the import.
      return symbol.removed.length + 1 === symbol.all.length;
    })
    .forEach((symbol) => {
      // Remove the whole declaration if it's a single import.
      const nodeToRemove = symbol.singleImport ? symbol.importDecl : symbol.importSpec;
      ops.push(new RemoveNodeOperation(sourceFile, nodeToRemove));
    });

  return ops;
}
