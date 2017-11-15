import * as ts from 'typescript';

import { collectDeepNodes } from './ast_helpers';
import { removeImport } from './remove_import';
import { StandardTransform, TransformOperation, RemoveNodeOperation } from './interfaces';
import { makeTransform } from './make_transform';


export function removeDecorators(
  getTypeChecker: () => ts.TypeChecker,
  shouldTransform: (fileName: string) => boolean
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    if (!shouldTransform(sourceFile.fileName)) {
      return ops;
    }

    collectDeepNodes<ts.Decorator>(sourceFile, ts.SyntaxKind.Decorator)
      .filter((decorator) => shouldRemove(decorator, getTypeChecker()))
      .forEach((decorator) => {
        // Remove the decorator node.
        ops.push(new RemoveNodeOperation(sourceFile, decorator));
        // Also remove imports for identifiers used in the decorator.
        // TS doesn't automatically elide imports for things removed in transformers so we have
        // to do it manually.
        collectDeepNodes<ts.Identifier>(decorator, ts.SyntaxKind.Identifier)
          .forEach((identifier) => {
            // This is finding a lot of things that might not be imports at all, but we can't
            // use the type checker since previous transforms might have modified things
            // Worst case scenario, some imports will be left over because there was another
            // identifier somewhere in the file as a property access or something with the same
            // name as the identifer we want to remove.
            // TODO: figure out if there's a better way to elide imports.
            ops.push(...removeImport(sourceFile, [identifier]));
          });
      });

    return ops;
  };

  return makeTransform(standardTransform);
}

function shouldRemove(decorator: ts.Decorator, typeChecker: ts.TypeChecker): boolean {
  const origin = getDecoratorOrigin(decorator, typeChecker);

  return origin && origin.module === '@angular/core';
}

// Decorator helpers.
interface DecoratorOrigin {
  name: string;
  module: string;
}

function getDecoratorOrigin(
  decorator: ts.Decorator,
  typeChecker: ts.TypeChecker
): DecoratorOrigin | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null;
  }

  let identifier: ts.Node;
  let name: string;
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
      name = declaration.name.text;
      module = (declaration.parent.moduleSpecifier as ts.StringLiteral).text;
    } else {
      return null;
    }

    return { name, module };
  }

  return null;
}
