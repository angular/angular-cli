/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

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

  const importClause = ts.factory.createImportClause(
    isClauseTypeOnly, // Set isTypeOnly on the clause if only type imports
    undefined,
    ts.factory.createNamedImports(allSpecifiers),
  );

  return ts.factory.createImportDeclaration(
    undefined,
    importClause,
    ts.factory.createStringLiteral('vitest'),
  );
}

export function createViCallExpression(
  methodName: string,
  args: readonly ts.Expression[] = [],
  typeArgs: ts.TypeNode[] | undefined = undefined,
): ts.CallExpression {
  const callee = ts.factory.createPropertyAccessExpression(
    ts.factory.createIdentifier('vi'),
    methodName,
  );

  return ts.factory.createCallExpression(callee, typeArgs, args);
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
