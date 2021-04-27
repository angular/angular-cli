/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

export function replaceResources(
  shouldTransform: (fileName: string) => boolean,
  getTypeChecker: () => ts.TypeChecker,
  directTemplateLoading = false,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const typeChecker = getTypeChecker();
    const resourceImportDeclarations: ts.ImportDeclaration[] = [];
    const moduleKind = context.getCompilerOptions().module;
    const nodeFactory = context.factory;

    const visitNode: ts.Visitor = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const decorators = ts.visitNodes(node.decorators, node =>
          ts.isDecorator(node)
            ? visitDecorator(nodeFactory, node, typeChecker, directTemplateLoading, resourceImportDeclarations, moduleKind)
            : node,
        );

        return nodeFactory.updateClassDeclaration(
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

    return (sourceFile: ts.SourceFile) => {
      if (!shouldTransform(sourceFile.fileName)) {
        return sourceFile;
      }

      const updatedSourceFile = ts.visitNode(sourceFile, visitNode);
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
  directTemplateLoading: boolean,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind?: ts.ModuleKind,
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
  let properties = ts.visitNodes(objectExpression.properties, node =>
    ts.isObjectLiteralElementLike(node)
      ? visitComponentMetadata(nodeFactory, node, styleReplacements, directTemplateLoading, resourceImportDeclarations, moduleKind)
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
    nodeFactory.updateCallExpression(decoratorFactory, decoratorFactory.expression, decoratorFactory.typeArguments, [
      nodeFactory.updateObjectLiteralExpression(objectExpression, properties),
    ]),
  );
}

function visitComponentMetadata(
  nodeFactory: ts.NodeFactory,
  node: ts.ObjectLiteralElementLike,
  styleReplacements: ts.Expression[],
  directTemplateLoading: boolean,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind?: ts.ModuleKind,
): ts.ObjectLiteralElementLike | undefined {
  if (!ts.isPropertyAssignment(node) || ts.isComputedPropertyName(node.name)) {
    return node;
  }

  const name = node.name.text;
  switch (name) {
    case 'moduleId':
      return undefined;

    case 'templateUrl':
      const importName = createResourceImport(
        nodeFactory,
        node.initializer,
        directTemplateLoading ? '!raw-loader!' : '',
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
    case 'styleUrls':
      if (!ts.isArrayLiteralExpression(node.initializer)) {
        return node;
      }

      const isInlineStyles = name === 'styles';
      const styles = ts.visitNodes(node.initializer.elements, node => {
        if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
          return node;
        }

        if (isInlineStyles) {
          return nodeFactory.createStringLiteral(node.text);
        }

        return createResourceImport(nodeFactory, node, undefined, resourceImportDeclarations, moduleKind) || node;
      });

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

export function getResourceUrl(node: ts.Node, loader = ''): string | null {
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

function createResourceImport(
  nodeFactory: ts.NodeFactory,
  node: ts.Node,
  loader: string | undefined,
  resourceImportDeclarations: ts.ImportDeclaration[],
  moduleKind = ts.ModuleKind.ES2015,
): ts.Identifier | ts.Expression | null {
  const url = getResourceUrl(node, loader);
  if (!url) {
    return null;
  }

  const urlLiteral = nodeFactory.createStringLiteral(url);

  if (moduleKind < ts.ModuleKind.ES2015) {
    return nodeFactory.createPropertyAccessExpression(
      nodeFactory.createCallExpression(
        nodeFactory.createIdentifier('require'),
        [],
        [urlLiteral],
      ),
      'default',
    );
  } else {
    const importName = nodeFactory.createIdentifier(`__NG_CLI_RESOURCE__${resourceImportDeclarations.length}`);
    resourceImportDeclarations.push(nodeFactory.createImportDeclaration(
      undefined,
      undefined,
      nodeFactory.createImportClause(false, importName, undefined),
      urlLiteral,
    ));

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
