/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

export function addVitestAutoImport(imports: Set<string>, importName: string): void {
  imports.add(importName);
}

export function getVitestAutoImports(imports: Set<string>): ts.ImportDeclaration | undefined {
  if (!imports?.size) {
    return undefined;
  }

  const importNames = [...imports];
  importNames.sort();
  const importSpecifiers = importNames.map((i) =>
    ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(i)),
  );

  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      ts.SyntaxKind.TypeKeyword,
      undefined,
      ts.factory.createNamedImports(importSpecifiers),
    ),
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
