/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';

export function addVitestValueImport(imports: Set<string>, importName: string): void {
  imports.add(importName);
}

export function addVitestTypeImport(imports: Set<string>, importName: string): void {
  imports.add(importName);
}

export function getVitestAutoImports(
  valueImports: Set<string>,
  typeImports: Set<string>,
): ts.ImportDeclaration | undefined {
  if (valueImports.size === 0 && typeImports.size === 0) {
    return undefined;
  }

  const isClauseTypeOnly = valueImports.size === 0 && typeImports.size > 0;
  const allSpecifiers: ts.ImportSpecifier[] = [];

  // Add value imports
  for (const i of [...valueImports].sort()) {
    allSpecifiers.push(
      ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(i)),
    );
  }

  // Add type imports
  for (const i of [...typeImports].sort()) {
    // Only set isTypeOnly on individual specifiers if the clause itself is NOT type-only
    allSpecifiers.push(
      ts.factory.createImportSpecifier(
        !isClauseTypeOnly,
        undefined,
        ts.factory.createIdentifier(i),
      ),
    );
  }

  allSpecifiers.sort((a, b) => a.name.text.localeCompare(b.name.text));

  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      isClauseTypeOnly, // Set isTypeOnly on the clause if only type imports
      undefined,
      ts.factory.createNamedImports(allSpecifiers),
    ),
    ts.factory.createStringLiteral('vitest'),
  );
}

export function createExpectCallExpression(
  args: ts.Expression[],
  typeArgs: ts.TypeNode[] | undefined = undefined,
): ts.CallExpression {
  return ts.factory.createCallExpression(ts.factory.createIdentifier('expect'), typeArgs, args);
}

export function createPropertyAccess(
  expressionOrIndentifierText: ts.Expression | string,
  name: string | ts.MemberName,
): ts.PropertyAccessExpression {
  return ts.factory.createPropertyAccessExpression(
    typeof expressionOrIndentifierText === 'string'
      ? ts.factory.createIdentifier(expressionOrIndentifierText)
      : expressionOrIndentifierText,
    name,
  );
}

export function getPromiseResolveRejectMethod(node: ts.Node): {
  methodName: 'resolve' | 'reject';
  arguments: ts.NodeArray<ts.Expression>;
} | null {
  if (!ts.isCallExpression(node)) {
    return null;
  }

  const expr = node.expression;
  if (
    !ts.isPropertyAccessExpression(expr) ||
    !ts.isIdentifier(expr.expression) ||
    expr.expression.escapedText !== 'Promise'
  ) {
    return null;
  }

  const methodName = expr.name.escapedText as string;
  const isResolveReject = methodName === 'resolve' || methodName === 'reject';
  if (!isResolveReject) {
    return null;
  }

  return {
    methodName,
    arguments: node.arguments,
  };
}

/**
 * Checks if a named binding is imported from the given module in the source file.
 * @param sourceFile The source file to search for imports.
 * @param name The import name (e.g. 'flush', 'tick').
 * @param moduleSpecifier The module path (e.g. '@angular/core/testing').
 */
export function isNamedImportFrom(
  sourceFile: ts.SourceFile,
  name: string,
  moduleSpecifier: string,
): boolean {
  return sourceFile.statements.some((statement) => {
    if (!_isImportDeclarationWithNamedBindings(statement)) {
      return false;
    }

    const specifier = statement.moduleSpecifier;
    const modulePath = ts.isStringLiteralLike(specifier) ? specifier.text : null;
    if (modulePath !== moduleSpecifier) {
      return false;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      const importedName = element.propertyName ? element.propertyName.text : element.name.text;
      if (importedName === name) {
        return true;
      }
    }
  });
}

/**
 * Removes specified import specifiers from ImportDeclarations.
 * If all specifiers are removed from an import, the entire import is dropped.
 */
export function removeImportSpecifiers(
  sourceFile: ts.SourceFile,
  removals: Map<string, Set<string>>,
): ts.SourceFile {
  const newStatements = sourceFile.statements
    .map((statement) => {
      if (!_isImportDeclarationWithNamedBindings(statement)) {
        return statement;
      }

      const specifier = statement.moduleSpecifier;
      const modulePath = ts.isStringLiteralLike(specifier) ? specifier.text : null;
      if (modulePath === null) {
        return statement;
      }

      const namesToRemove = removals.get(modulePath);
      if (namesToRemove === undefined || namesToRemove.size === 0) {
        return statement;
      }

      const remaining = statement.importClause.namedBindings.elements.filter((el) => {
        const name = el.propertyName ? el.propertyName.text : el.name.text;

        return !namesToRemove.has(name);
      });

      if (remaining.length === 0) {
        return;
      }

      if (remaining.length === statement.importClause.namedBindings.elements.length) {
        return statement;
      }

      return ts.factory.updateImportDeclaration(
        statement,
        statement.modifiers,
        ts.factory.updateImportClause(
          statement.importClause,
          undefined,
          statement.importClause.name,
          ts.factory.createNamedImports(remaining),
        ),
        statement.moduleSpecifier,
        statement.attributes,
      );
    })
    .filter((statement) => statement !== undefined);

  return ts.factory.updateSourceFile(sourceFile, newStatements);
}

function _isImportDeclarationWithNamedBindings(
  statement: ts.Statement,
): statement is ts.ImportDeclaration & {
  importClause: ts.ImportClause & { namedBindings: ts.NamedImports };
} {
  return (
    ts.isImportDeclaration(statement) &&
    statement.importClause?.namedBindings !== undefined &&
    ts.isNamedImports(statement.importClause.namedBindings)
  );
}
