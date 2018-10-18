/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

/**
 * @deprecated From 0.9.0
 */
export function testImportTslib(content: string) {
  const regex = /var (__extends|__decorate|__metadata|__param) = \(.*\r?\n(    .*\r?\n)*\};/;

  return regex.test(content);
}

export function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Check if node is a TS helper declaration and replace with import if yes
        if (ts.isVariableStatement(node)) {
          const declarations = node.declarationList.declarations;

          if (declarations.length === 1 && ts.isIdentifier(declarations[0].name)) {
            const name = (declarations[0].name as ts.Identifier).text;

            if (isHelperName(name)) {
              // TODO: maybe add a few more checks, like checking the first part of the assignment.

              return createTslibImport(name);
            }
          }
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitEachChild(sf, visitor, context);
    };

    return transformer;
  };
}

function createTslibImport(name: string): ts.Node {
  // Use `import { __helper } from "tslib"`.
  const namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined,
    ts.createIdentifier(name))]);
  const importClause = ts.createImportClause(undefined, namedImports);
  const newNode = ts.createImportDeclaration(undefined, undefined, importClause,
    ts.createLiteral('tslib'));

  return newNode;
}

function isHelperName(name: string): boolean {
  // TODO: there are more helpers than these, should we replace them all?
  const tsHelpers = [
    '__extends',
    '__decorate',
    '__metadata',
    '__param',
  ];

  return tsHelpers.indexOf(name) !== -1;
}
