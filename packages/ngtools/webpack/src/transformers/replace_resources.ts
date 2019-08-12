/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import * as ts from 'typescript';

export function replaceResources(
  shouldTransform: (fileName: string) => boolean,
  getTypeChecker: () => ts.TypeChecker,
  directTemplateLoading = false,
): ts.TransformerFactory<ts.SourceFile> {

  return (context: ts.TransformationContext) => {
    const typeChecker = getTypeChecker();

    const visitNode: ts.Visitor = (node: ts.Decorator) => {
      if (ts.isClassDeclaration(node)) {
        const decorators = ts.visitNodes(
          node.decorators,
          (node: ts.Decorator) => visitDecorator(node, typeChecker, directTemplateLoading),
        );

        return ts.updateClassDeclaration(
          node,
          decorators,
          node.modifiers,
          node.name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      }

      return ts.visitEachChild(node, visitNode, context);
    };

    // emit helper for `import Name from "foo"`
    const importDefaultHelper: ts.EmitHelper = {
      name: 'typescript:commonjsimportdefault',
      scoped: false,
      text: tags.stripIndent`
      var __importDefault = (this && this.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
      };`,
    };

    return (sourceFile: ts.SourceFile) => {
      if (shouldTransform(sourceFile.fileName)) {
        context.requestEmitHelper(importDefaultHelper);

        return ts.visitNode(sourceFile, visitNode);
      }

      return sourceFile;
    };
  };
}

function visitDecorator(
  node: ts.Decorator,
  typeChecker: ts.TypeChecker,
  directTemplateLoading: boolean): ts.Decorator {
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
  let properties = ts.visitNodes(
    objectExpression.properties,
    (node: ts.ObjectLiteralElementLike) =>
      visitComponentMetadata(node, styleReplacements, directTemplateLoading),
  );

  // replace properties with updated properties
  if (styleReplacements.length > 0) {
    const styleProperty = ts.createPropertyAssignment(
      ts.createIdentifier('styles'),
      ts.createArrayLiteral(styleReplacements),
    );

    properties = ts.createNodeArray([...properties, styleProperty]);
  }

  return ts.updateDecorator(
    node,
    ts.updateCall(
      decoratorFactory,
      decoratorFactory.expression,
      decoratorFactory.typeArguments,
      [ts.updateObjectLiteral(objectExpression, properties)],
    ),
  );
}

function visitComponentMetadata(
  node: ts.ObjectLiteralElementLike,
  styleReplacements: ts.Expression[],
  directTemplateLoading: boolean,
): ts.ObjectLiteralElementLike | undefined {
  if (!ts.isPropertyAssignment(node) || ts.isComputedPropertyName(node.name)) {
    return node;
  }

  const name = node.name.text;
  switch (name) {
    case 'moduleId':

      return undefined;

    case 'templateUrl':
      return ts.updatePropertyAssignment(
        node,
        ts.createIdentifier('template'),
        createRequireExpression(node.initializer, directTemplateLoading ? '!raw-loader!' : ''),
      );

    case 'styles':
    case 'styleUrls':
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        return node;
      }

      const isInlineStyles = name === 'styles';
      const styles = ts.visitNodes(
        node.initializer.elements,
        (node: ts.Expression) => {
          if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
            return node;
          }

          return isInlineStyles ? ts.createLiteral(node.text) : createRequireExpression(node);
        },
      );

      // Styles should be placed first
      if (isInlineStyles) {
        styleReplacements.unshift(...styles);
      } else {
        styleReplacements.push(...styles);
      }

      return undefined;

    default:
      return node;
  }
}

export function getResourceUrl(node: ts.Expression, loader = ''): string | null {
  // only analyze strings
  if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
    return null;
  }

  return `${loader}${/^\.?\.\//.test(node.text) ? '' : './'}${node.text}`;
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

function createRequireExpression(node: ts.Expression, loader?: string): ts.Expression {
  const url = getResourceUrl(node, loader);
  if (!url) {
    return node;
  }

  const callExpression = ts.createCall(
    ts.createIdentifier('require'),
    undefined,
    [ts.createLiteral(url)],
  );

  return ts.createPropertyAccess(
    ts.createCall(
      ts.setEmitFlags(
        ts.createIdentifier('__importDefault'),
        ts.EmitFlags.HelperName | ts.EmitFlags.AdviseOnEmitNode,
      ),
      undefined,
      [callExpression],
    ),
    'default',
  );
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
