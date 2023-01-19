/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import ts from 'typescript';
import { generateJitFileUri, generateJitInlineUri } from './uri';

/**
 * Creates a TypeScript Transformer to transform Angular Component resource references into
 * static import statements. This transformer is used in Angular's JIT compilation mode to
 * support processing of component resources. When in AOT mode, the Angular AOT compiler handles
 * this processing and this transformer is not used.
 * @param getTypeChecker A function that returns a TypeScript TypeChecker instance for the program.
 * @returns A TypeScript transformer factory.
 */
export function createJitResourceTransformer(
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const typeChecker = getTypeChecker();
    const nodeFactory = context.factory;
    const resourceImportDeclarations: ts.ImportDeclaration[] = [];

    const visitNode: ts.Visitor = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const decorators = ts.getDecorators(node);

        if (!decorators || decorators.length === 0) {
          return node;
        }

        return nodeFactory.updateClassDeclaration(
          node,
          [
            ...decorators.map((current) =>
              visitDecorator(nodeFactory, current, typeChecker, resourceImportDeclarations),
            ),
            ...(ts.getModifiers(node) ?? []),
          ],
          node.name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      }

      return ts.visitEachChild(node, visitNode, context);
    };

    return (sourceFile) => {
      const updatedSourceFile = ts.visitEachChild(sourceFile, visitNode, context);

      if (resourceImportDeclarations.length > 0) {
        return nodeFactory.updateSourceFile(
          updatedSourceFile,
          ts.setTextRange(
            nodeFactory.createNodeArray(
              [...resourceImportDeclarations, ...updatedSourceFile.statements],
              updatedSourceFile.statements.hasTrailingComma,
            ),
            updatedSourceFile.statements,
          ),
          updatedSourceFile.isDeclarationFile,
          updatedSourceFile.referencedFiles,
          updatedSourceFile.typeReferenceDirectives,
          updatedSourceFile.hasNoDefaultLib,
          updatedSourceFile.libReferenceDirectives,
        );
      } else {
        return updatedSourceFile;
      }
    };
  };
}

function visitDecorator(
  nodeFactory: ts.NodeFactory,
  node: ts.Decorator,
  typeChecker: ts.TypeChecker,
  resourceImportDeclarations: ts.ImportDeclaration[],
): ts.Decorator {
  const origin = getDecoratorOrigin(node, typeChecker);
  if (!origin || origin.module !== '@angular/core' || origin.name !== 'Component') {
    return node;
  }

  if (!ts.isCallExpression(node.expression)) {
    return node;
  }

  const decoratorFactory = node.expression;
  const args = decoratorFactory.arguments;
  if (args.length !== 1 || !ts.isObjectLiteralExpression(args[0])) {
    // Unsupported component metadata
    return node;
  }

  const objectExpression = args[0] as ts.ObjectLiteralExpression;
  const styleReplacements: ts.Expression[] = [];

  // visit all properties
  let properties = ts.visitNodes(objectExpression.properties, (node) =>
    ts.isObjectLiteralElementLike(node)
      ? visitComponentMetadata(nodeFactory, node, styleReplacements, resourceImportDeclarations)
      : node,
  );

  // replace properties with updated properties
  if (styleReplacements.length > 0) {
    const styleProperty = nodeFactory.createPropertyAssignment(
      nodeFactory.createIdentifier('styles'),
      nodeFactory.createArrayLiteralExpression(styleReplacements),
    );

    properties = nodeFactory.createNodeArray([...properties, styleProperty]);
  }

  return nodeFactory.updateDecorator(
    node,
    nodeFactory.updateCallExpression(
      decoratorFactory,
      decoratorFactory.expression,
      decoratorFactory.typeArguments,
      [nodeFactory.updateObjectLiteralExpression(objectExpression, properties)],
    ),
  );
}

function visitComponentMetadata(
  nodeFactory: ts.NodeFactory,
  node: ts.ObjectLiteralElementLike,
  styleReplacements: ts.Expression[],
  resourceImportDeclarations: ts.ImportDeclaration[],
): ts.ObjectLiteralElementLike | undefined {
  if (!ts.isPropertyAssignment(node) || ts.isComputedPropertyName(node.name)) {
    return node;
  }

  switch (node.name.text) {
    case 'templateUrl':
      // Only analyze string literals
      if (
        !ts.isStringLiteral(node.initializer) &&
        !ts.isNoSubstitutionTemplateLiteral(node.initializer)
      ) {
        return node;
      }

      const url = node.initializer.text;
      if (!url) {
        return node;
      }

      return nodeFactory.updatePropertyAssignment(
        node,
        nodeFactory.createIdentifier('template'),
        createResourceImport(
          nodeFactory,
          generateJitFileUri(url, 'template'),
          resourceImportDeclarations,
        ),
      );
    case 'styles':
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        return node;
      }

      const inlineStyles = ts.visitNodes(node.initializer.elements, (node) => {
        if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
          return node;
        }

        const contents = node.text;
        if (!contents) {
          // An empty inline style is equivalent to not having a style element
          return undefined;
        }

        return createResourceImport(
          nodeFactory,
          generateJitInlineUri(contents, 'style'),
          resourceImportDeclarations,
        );
      });

      // Inline styles should be placed first
      styleReplacements.unshift(...inlineStyles);

      // The inline styles will be added afterwards in combination with any external styles
      return undefined;
    case 'styleUrls':
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        return node;
      }

      const externalStyles = ts.visitNodes(node.initializer.elements, (node) => {
        if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
          return node;
        }

        const url = node.text;
        if (!url) {
          return node;
        }

        return createResourceImport(
          nodeFactory,
          generateJitFileUri(url, 'style'),
          resourceImportDeclarations,
        );
      });

      // External styles are applied after any inline styles
      styleReplacements.push(...externalStyles);

      // The external styles will be added afterwards in combination with any inline styles
      return undefined;
    default:
      // All other elements are passed through
      return node;
  }
}

function createResourceImport(
  nodeFactory: ts.NodeFactory,
  url: string,
  resourceImportDeclarations: ts.ImportDeclaration[],
): ts.Identifier {
  const urlLiteral = nodeFactory.createStringLiteral(url);

  const importName = nodeFactory.createIdentifier(
    `__NG_CLI_RESOURCE__${resourceImportDeclarations.length}`,
  );
  resourceImportDeclarations.push(
    nodeFactory.createImportDeclaration(
      undefined,
      nodeFactory.createImportClause(false, importName, undefined),
      urlLiteral,
    ),
  );

  return importName;
}

function getDecoratorOrigin(
  decorator: ts.Decorator,
  typeChecker: ts.TypeChecker,
): { name: string; module: string } | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null;
  }

  let identifier: ts.Node;
  let name = '';

  if (ts.isPropertyAccessExpression(decorator.expression.expression)) {
    identifier = decorator.expression.expression.expression;
    name = decorator.expression.expression.name.text;
  } else if (ts.isIdentifier(decorator.expression.expression)) {
    identifier = decorator.expression.expression;
  } else {
    return null;
  }

  // NOTE: resolver.getReferencedImportDeclaration would work as well but is internal
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (symbol && symbol.declarations && symbol.declarations.length > 0) {
    const declaration = symbol.declarations[0];
    let module: string;

    if (ts.isImportSpecifier(declaration)) {
      name = (declaration.propertyName || declaration.name).text;
      module = (declaration.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text;
    } else if (ts.isNamespaceImport(declaration)) {
      // Use the name from the decorator namespace property access
      module = (declaration.parent.parent.moduleSpecifier as ts.StringLiteral).text;
    } else if (ts.isImportClause(declaration)) {
      name = (declaration.name as ts.Identifier).text;
      module = (declaration.parent.moduleSpecifier as ts.StringLiteral).text;
    } else {
      return null;
    }

    return { name, module };
  }

  return null;
}
