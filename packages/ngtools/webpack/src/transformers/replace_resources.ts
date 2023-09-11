/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { InlineAngularResourceLoaderPath } from '../loaders/inline-resource';

export const NG_COMPONENT_RESOURCE_QUERY = 'ngResource';

export function replaceResources(
  shouldTransform: (fileName: string) => boolean,
  getTypeChecker: () => ts.TypeChecker,
  inlineStyleFileExtension?: string,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const typeChecker = getTypeChecker();
    const resourceImportDeclarations: ts.ImportDeclaration[] = [];
    const moduleKind = context.getCompilerOptions().module;
    const nodeFactory = context.factory;

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
              visitDecorator(
                nodeFactory,
                current,
                typeChecker,
                resourceImportDeclarations,
                moduleKind,
                inlineStyleFileExtension,
              ),
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

    return (sourceFile: ts.SourceFile) => {
      if (!shouldTransform(sourceFile.fileName)) {
        return sourceFile;
      }

      const updatedSourceFile = ts.visitNode(sourceFile, visitNode) as ts.SourceFile;
      if (resourceImportDeclarations.length) {
        // Add resource imports
        return context.factory.updateSourceFile(
          updatedSourceFile,
          ts.setTextRange(
            context.factory.createNodeArray([
              ...resourceImportDeclarations,
              ...updatedSourceFile.statements,
            ]),
            updatedSourceFile.statements,
          ),
        );
      }

      return updatedSourceFile;
    };
  };
}

function visitDecorator(
  nodeFactory: ts.NodeFactory,
  node: ts.Decorator,
  typeChecker: ts.TypeChecker,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind?: ts.ModuleKind,
  inlineStyleFileExtension?: string,
): ts.Decorator {
  if (!isComponentDecorator(node, typeChecker)) {
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
      ? visitComponentMetadata(
          nodeFactory,
          node,
          styleReplacements,
          resourceImportDeclarations,
          moduleKind,
          inlineStyleFileExtension,
        )
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
  moduleKind: ts.ModuleKind = ts.ModuleKind.ES2015,
  inlineStyleFileExtension?: string,
): ts.ObjectLiteralElementLike | undefined {
  if (!ts.isPropertyAssignment(node) || ts.isComputedPropertyName(node.name)) {
    return node;
  }

  const name = node.name.text;
  switch (name) {
    case 'moduleId':
      return undefined;

    case 'templateUrl':
      const url = getResourceUrl(node.initializer);
      if (!url) {
        return node;
      }

      const importName = createResourceImport(
        nodeFactory,
        url,
        resourceImportDeclarations,
        moduleKind,
      );
      if (!importName) {
        return node;
      }

      return nodeFactory.updatePropertyAssignment(
        node,
        nodeFactory.createIdentifier('template'),
        importName,
      );
    case 'styles':
    case 'styleUrl':
    case 'styleUrls':
      const isInlineStyle = name === 'styles';
      let styles: Iterable<ts.Expression>;

      if (ts.isStringLiteralLike(node.initializer)) {
        styles = [
          transformInlineStyleLiteral(
            node.initializer,
            nodeFactory,
            isInlineStyle,
            inlineStyleFileExtension,
            resourceImportDeclarations,
            moduleKind,
          ) as ts.StringLiteralLike,
        ];
      } else if (ts.isArrayLiteralExpression(node.initializer)) {
        styles = ts.visitNodes(node.initializer.elements, (node) =>
          transformInlineStyleLiteral(
            node,
            nodeFactory,
            isInlineStyle,
            inlineStyleFileExtension,
            resourceImportDeclarations,
            moduleKind,
          ),
        ) as ts.NodeArray<ts.Expression>;
      } else {
        return node;
      }

      // Styles should be placed first
      if (isInlineStyle) {
        styleReplacements.unshift(...styles);
      } else {
        styleReplacements.push(...styles);
      }

      return undefined;
    default:
      return node;
  }
}

function transformInlineStyleLiteral(
  node: ts.Node,
  nodeFactory: ts.NodeFactory,
  isInlineStyle: boolean,
  inlineStyleFileExtension: string | undefined,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind: ts.ModuleKind,
) {
  if (!ts.isStringLiteralLike(node)) {
    return node;
  }

  if (!isInlineStyle) {
    const url = getResourceUrl(node);

    return url
      ? createResourceImport(nodeFactory, url, resourceImportDeclarations, moduleKind)
      : node;
  }

  if (!inlineStyleFileExtension) {
    return nodeFactory.createStringLiteral(node.text);
  }

  const data = Buffer.from(node.text).toString('base64');
  const containingFile = node.getSourceFile().fileName;

  // app.component.ts.css?ngResource!=!@ngtools/webpack/src/loaders/inline-resource.js?data=...!app.component.ts
  const url =
    `${containingFile}.${inlineStyleFileExtension}?${NG_COMPONENT_RESOURCE_QUERY}` +
    `!=!${InlineAngularResourceLoaderPath}?data=${encodeURIComponent(data)}!${containingFile}`;

  return createResourceImport(nodeFactory, url, resourceImportDeclarations, moduleKind);
}

export function getResourceUrl(node: ts.Node): string | null {
  // only analyze strings
  if (!ts.isStringLiteralLike(node)) {
    return null;
  }

  return `${/^\.?\.\//.test(node.text) ? '' : './'}${node.text}?${NG_COMPONENT_RESOURCE_QUERY}`;
}

function isComponentDecorator(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.Decorator {
  if (!ts.isDecorator(node)) {
    return false;
  }

  const origin = getDecoratorOrigin(node, typeChecker);
  if (origin && origin.module === '@angular/core' && origin.name === 'Component') {
    return true;
  }

  return false;
}

function createResourceImport(
  nodeFactory: ts.NodeFactory,
  url: string,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind: ts.ModuleKind,
): ts.Identifier | ts.Expression {
  const urlLiteral = nodeFactory.createStringLiteral(url);

  if (moduleKind < ts.ModuleKind.ES2015) {
    return nodeFactory.createCallExpression(
      nodeFactory.createIdentifier('require'),
      [],
      [urlLiteral],
    );
  } else {
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
}

interface DecoratorOrigin {
  name: string;
  module: string;
}

function getDecoratorOrigin(
  decorator: ts.Decorator,
  typeChecker: ts.TypeChecker,
): DecoratorOrigin | null {
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
      module = (declaration.parent.parent.parent.moduleSpecifier as ts.Identifier).text;
    } else if (ts.isNamespaceImport(declaration)) {
      // Use the name from the decorator namespace property access
      module = (declaration.parent.parent.moduleSpecifier as ts.Identifier).text;
    } else if (ts.isImportClause(declaration)) {
      name = (declaration.name as ts.Identifier).text;
      module = (declaration.parent.moduleSpecifier as ts.Identifier).text;
    } else {
      return null;
    }

    return { name, module };
  }

  return null;
}
