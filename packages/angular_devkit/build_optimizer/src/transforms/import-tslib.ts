/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


export function testImportTslib(content: string) {
  const regex = /var (__extends|__decorate|__metadata|__param) = \(.*\r?\n(    .*\r?\n)*\};/;

  // This transform introduces import/require() calls, but this won't work properly on libraries
  // built with Webpack. These libraries use __webpack_require__() calls instead, which will break
  // with a new import that wasn't part of it's original module list.
  // We ignore this transform for such libraries.
  const webpackRequireRegex = /__webpack_require__/;

  return regex.test(content) && !webpackRequireRegex.test(content);
}

export function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      // Check if module has CJS exports. If so, use 'require()' instead of 'import'.
      const useRequire = /exports.\S+\s*=/.test(sf.getText());

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Check if node is a TS helper declaration and replace with import if yes
        if (ts.isVariableStatement(node)) {
          const declarations = node.declarationList.declarations;

          if (declarations.length === 1 && ts.isIdentifier(declarations[0].name)) {
            // NOTE: the replace is unnecessary with TS2.5+; tests currently run with TS2.4
            const name = (declarations[0].name as ts.Identifier).text.replace(/^___/, '__');

            if (isHelperName(name)) {
              // TODO: maybe add a few more checks, like checking the first part of the assignment.

              return createTslibImport(name, useRequire);
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

function createTslibImport(name: string, useRequire = false): ts.Node {
  if (useRequire) {
    // Use `var __helper = /*@__PURE__*/ require("tslib").__helper`.
    const requireCall = ts.createCall(ts.createIdentifier('require'), undefined,
      [ts.createLiteral('tslib')]);
    const pureRequireCall = ts.addSyntheticLeadingComment(
      requireCall, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', false);
    const helperAccess = ts.createPropertyAccess(pureRequireCall, name);
    const variableDeclaration = ts.createVariableDeclaration(name, undefined, helperAccess);
    const variableStatement = ts.createVariableStatement(undefined, [variableDeclaration]);

    return variableStatement;
  } else {
    // Use `import { __helper } from "tslib"`.
    const namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined,
      ts.createIdentifier(name))]);
    const importClause = ts.createImportClause(undefined, namedImports);
    const newNode = ts.createImportDeclaration(undefined, undefined, importClause,
      ts.createLiteral('tslib'));

    return newNode;
  }
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
