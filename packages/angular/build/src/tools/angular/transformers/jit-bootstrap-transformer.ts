/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';

/**
 * The name of the Angular platform that should be replaced within
 * bootstrap call expressions to support AOT.
 */
const PLATFORM_BROWSER_DYNAMIC_NAME = 'platformBrowserDynamic';

export function replaceBootstrap(
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    let bootstrapImport: ts.ImportDeclaration | undefined;
    let bootstrapNamespace: ts.Identifier | undefined;
    const replacedNodes: ts.Node[] = [];
    const nodeFactory = context.factory;

    const visitNode: ts.Visitor = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const target = node.expression;
        if (target.text === PLATFORM_BROWSER_DYNAMIC_NAME) {
          if (!bootstrapNamespace) {
            bootstrapNamespace = nodeFactory.createUniqueName('__NgCli_bootstrap_');
            bootstrapImport = nodeFactory.createImportDeclaration(
              undefined,
              nodeFactory.createImportClause(
                undefined,
                undefined,
                nodeFactory.createNamespaceImport(bootstrapNamespace),
              ),
              nodeFactory.createStringLiteral('@angular/platform-browser'),
            );
          }
          replacedNodes.push(target);

          return nodeFactory.updateCallExpression(
            node,
            nodeFactory.createPropertyAccessExpression(bootstrapNamespace, 'platformBrowser'),
            node.typeArguments,
            node.arguments,
          );
        }
      }

      return ts.visitEachChild(node, visitNode, context);
    };

    return (sourceFile: ts.SourceFile) => {
      if (!sourceFile.text.includes(PLATFORM_BROWSER_DYNAMIC_NAME)) {
        return sourceFile;
      }

      let updatedSourceFile = ts.visitEachChild(sourceFile, visitNode, context);

      if (bootstrapImport) {
        // Remove any unused platform browser dynamic imports
        const removals = elideImports(
          updatedSourceFile,
          replacedNodes,
          getTypeChecker,
          context.getCompilerOptions(),
        );
        if (removals.size > 0) {
          updatedSourceFile = ts.visitEachChild(
            updatedSourceFile,
            (node) => (removals.has(node) ? undefined : node),
            context,
          );
        }

        // Add new platform browser import
        return nodeFactory.updateSourceFile(
          updatedSourceFile,
          ts.setTextRange(
            nodeFactory.createNodeArray([bootstrapImport, ...updatedSourceFile.statements]),
            sourceFile.statements,
          ),
        );
      } else {
        return updatedSourceFile;
      }
    };
  };
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

    // Type reference imports do not need to be emitted when emitDecoratorMetadata is disabled.
    if (ts.isTypeReferenceNode(node) && !compilerOptions.emitDecoratorMetadata) {
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

  const isUnused = (node: ts.Identifier) => {
    // Do not remove JSX factory imports
    if (node.text === compilerOptions.jsxFactory) {
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

    const namedBindings = node.importClause.namedBindings;

    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      // "import * as XYZ from 'abc';"
      if (isUnused(namedBindings.name)) {
        importNodeRemovals.add(node);
      }
    } else {
      const specifierNodeRemovals = [];
      let clausesCount = 0;

      // "import { XYZ, ... } from 'abc';"
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        let removedClausesCount = 0;
        clausesCount += namedBindings.elements.length;

        for (const specifier of namedBindings.elements) {
          if (specifier.isTypeOnly || isUnused(specifier.name)) {
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

        if (node.importClause.isTypeOnly || isUnused(node.importClause.name)) {
          specifierNodeRemovals.push(node.importClause.name);
        }
      }

      if (specifierNodeRemovals.length === clausesCount) {
        importNodeRemovals.add(node);
      } else {
        for (const specifierNodeRemoval of specifierNodeRemovals) {
          importNodeRemovals.add(specifierNodeRemoval);
        }
      }
    }
  }

  return importNodeRemovals;
}
