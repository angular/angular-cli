/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { generateJitFileUri, generateJitInlineUri } from '../uri';

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

  const objectExpression = args[0];
  const styleReplacements: ts.Expression[] = [];

  // visit all properties
  let properties = ts.visitNodes(objectExpression.properties, (node) =>
    ts.isObjectLiteralElementLike(node)
      ? visitComponentMetadata(nodeFactory, node, styleReplacements, resourceImportDeclarations)
      : node,
  ) as ts.NodeArray<ts.ObjectLiteralElementLike>;

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
      if (!ts.isStringLiteralLike(node.initializer)) {
        return node;
      }

      return node.initializer.text.length === 0
        ? node
        : nodeFactory.updatePropertyAssignment(
            node,
            nodeFactory.createIdentifier('template'),
            createResourceImport(
              nodeFactory,
              generateJitFileUri(node.initializer.text, 'template'),
              resourceImportDeclarations,
            ),
          );
    case 'styles':
      if (ts.isStringLiteralLike(node.initializer)) {
        styleReplacements.unshift(
          createResourceImport(
            nodeFactory,
            generateJitInlineUri(node.initializer.text, 'style'),
            resourceImportDeclarations,
          ),
        );

        return undefined;
      }

      if (ts.isArrayLiteralExpression(node.initializer)) {
        const inlineStyles = ts.visitNodes(node.initializer.elements, (node) => {
          if (!ts.isStringLiteralLike(node)) {
            return node;
          }

          return node.text.length === 0
            ? undefined // An empty inline style is equivalent to not having a style element
            : createResourceImport(
                nodeFactory,
                generateJitInlineUri(node.text, 'style'),
                resourceImportDeclarations,
              );
        }) as ts.NodeArray<ts.Expression>;

        // Inline styles should be placed first
        styleReplacements.unshift(...inlineStyles);

        // The inline styles will be added afterwards in combination with any external styles
        return undefined;
      }

      return node;

    case 'styleUrl':
      if (ts.isStringLiteralLike(node.initializer)) {
        styleReplacements.push(
          createResourceImport(
            nodeFactory,
            generateJitFileUri(node.initializer.text, 'style'),
            resourceImportDeclarations,
          ),
        );

        return undefined;
      }

      return node;

    case 'styleUrls': {
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        return node;
      }

      const externalStyles = ts.visitNodes(node.initializer.elements, (node) => {
        if (!ts.isStringLiteralLike(node)) {
          return node;
        }

        return node.text
          ? createResourceImport(
              nodeFactory,
              generateJitFileUri(node.text, 'style'),
              resourceImportDeclarations,
            )
          : undefined;
      }) as ts.NodeArray<ts.Expression>;

      // External styles are applied after any inline styles
      styleReplacements.push(...externalStyles);

      // The external styles will be added afterwards in combination with any inline styles
      return undefined;
    }
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
      nodeFactory.createImportClause(undefined, importName, undefined),
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
