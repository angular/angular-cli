import * as ts from 'typescript';

export function createSingleImport(
  module: string,
  name: string,
  alias?: string | ts.Identifier
): ts.ImportDeclaration {
  let nameIdentifier;
  let propertyNameIdentifier;
  if (alias) {
    nameIdentifier = typeof alias === 'string' ? ts.createIdentifier(alias) : alias;
    propertyNameIdentifier = ts.createIdentifier(name);
  } else {
    nameIdentifier = ts.createIdentifier(name);
    propertyNameIdentifier = undefined;
  }
  return ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamedImports(
        [
          ts.createImportSpecifier(
            propertyNameIdentifier,
            nameIdentifier
          )
        ]
      )
    ),
    ts.createLiteral(module),
  );
}

export function createNamespaceImport(
  module: string,
  name: string | ts.Identifier,
): ts.ImportDeclaration {
  const nameIdentifier = typeof name === 'string' ? ts.createIdentifier(name) : name;
  return ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamespaceImport(nameIdentifier)
    ),
    ts.createLiteral(module),
  );
}

export function getDeclarations(
  identifier: ts.Identifier,
  typeChecker: ts.TypeChecker,
): Array<ts.Declaration> {
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (!symbol || !symbol.declarations) {
    return [];
  }

  return symbol.declarations;
}

export function cleanupImport(
  node: ts.ImportDeclaration,
  canRemove: (declaration: ts.Declaration) => boolean,
): ts.VisitResult<ts.ImportDeclaration> {
  if (!node.importClause) {
    return node;
  }

  const importClause = ts.visitNode(node.importClause, (node: ts.ImportClause) => {
    if (node.name || !node.namedBindings) {
      return canRemove(node) ? undefined : node;
    }

    if (ts.isNamespaceImport(node.namedBindings)) {
      return canRemove(node.namedBindings) ? undefined : node;
    }

    const elements = ts.visitNodes(
      node.namedBindings.elements,
      (element: ts.ImportSpecifier) => canRemove(element) ? undefined : element,
    );
    if (elements && elements.length > 0) {
      return ts.updateImportClause(
        node,
        node.name,
        ts.updateNamedImports(
          node.namedBindings,
          elements
        )
      );
    }
    return undefined;
  });

  if (importClause) {
    return ts.updateImportDeclaration(
      node,
      node.decorators,
      node.modifiers,
      importClause,
      node.moduleSpecifier
    );
  }

  return undefined;
}

// Workaround TS bug in TS < 2.5
export function fixupNodeSymbol<T extends ts.Node>(node: T): T {
  // tslint:disable-next-line:no-any - 'symbol' is internal
  (node as any).symbol = (node as any).symbol || (ts.getParseTreeNode(node) as any).symbol;

  return node;
}
