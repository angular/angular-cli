import * as ts from 'typescript';

import { findAstNodes } from './ast_helpers';
import { RemoveNodeOperation, TransformOperation } from './make_transform';

// Remove an import if we have removed all identifiers for it.
// Mainly workaround for https://github.com/Microsoft/TypeScript/issues/17552.
export function removeImport(
  sourceFile: ts.SourceFile,
  removedIdentifiers: ts.Identifier[]
): TransformOperation[] {
  const ops: TransformOperation[] = [];

  if (removedIdentifiers.length === 0) {
    return [];
  }

  const identifierText = removedIdentifiers[0].text;

  // Find all imports that import `identifierText`.
  const allImports = findAstNodes(null, sourceFile, ts.SyntaxKind.ImportDeclaration);
  const identifierImports = allImports
    .filter((node: ts.ImportDeclaration) => {
      // TODO: try to support removing `import * as X from 'XYZ'`.
      // Filter out import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
      const clause = node.importClause as ts.ImportClause;
      if (!clause || clause.name || !clause.namedBindings) {
        return false;
      }
      return clause.namedBindings.kind == ts.SyntaxKind.NamedImports;
    })
    .filter((node: ts.ImportDeclaration) => {
      // Filter out imports that that don't have `identifierText`.
      const namedImports = (node.importClause as ts.ImportClause).namedBindings as ts.NamedImports;
      return namedImports.elements.some((element: ts.ImportSpecifier) => {
        return element.name.text == identifierText;
      });
    });


  // Find all identifiers with `identifierText` in the source file.
  const allNodes = findAstNodes<ts.Identifier>(null, sourceFile, ts.SyntaxKind.Identifier, true)
    .filter(identifier => identifier.getText() === identifierText);

  // If there are more identifiers than the ones we already removed plus the ones we're going to
  // remove from imports, don't do anything.
  // This means that there's still a couple around that weren't removed and this would break code.
  if (allNodes.length > removedIdentifiers.length + identifierImports.length) {
    return [];
  }

  // Go through the imports.
  identifierImports.forEach((node: ts.ImportDeclaration) => {
    const namedImports = (node.importClause as ts.ImportClause).namedBindings as ts.NamedImports;
    // Only one import, remove the whole declaration.
    if (namedImports.elements.length === 1) {
      ops.push(new RemoveNodeOperation(sourceFile, node));
    } else {
      namedImports.elements.forEach((element: ts.ImportSpecifier) => {
        // Multiple imports, remove only the single identifier.
        if (element.name.text == identifierText) {
          ops.push(new RemoveNodeOperation(sourceFile, node));
        }
      });
    }

  });

  return ops;
}
