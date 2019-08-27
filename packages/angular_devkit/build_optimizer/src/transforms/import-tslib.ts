/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { getCleanHelperName } from '../helpers/ast-utils';

/**
 * @deprecated From 0.9.0
 */
export function testImportTslib(content: string) {
  const regex = /var (__extends|__decorate|__metadata|__param)(\$\d+)? = \(.*\r?\n\s+(.*\r?\n)*\s*\};/;

  return regex.test(content);
}

export function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const tslibImports: (ts.VariableStatement | ts.ImportDeclaration)[] = [];

      // Check if module has CJS exports. If so, use 'require()' instead of 'import'.
      const useRequire = /exports.\S+\s*=/.test(sf.getText());

      const visitor: ts.Visitor = (node: ts.Node): ts.Node | undefined => {

        // Check if node is a TS helper declaration and replace with import if yes
        if (ts.isVariableStatement(node)) {
          const declarations = node.declarationList.declarations;

          if (declarations.length === 1 && ts.isIdentifier(declarations[0].name)) {
            const name = declarations[0].name.text;
            const helperName = getCleanHelperName(name);

            if (helperName) {
              // TODO: maybe add a few more checks, like checking the first part of the assignment.
              const alias = name === helperName ? undefined : name;
              const tslibImport = createTslibImport(helperName, alias, useRequire);
              tslibImports.push(tslibImport);

              return undefined;
            }
          }
        }

        return ts.visitEachChild(node, visitor, context);
      };

      const sfUpdated = ts.visitEachChild(sf, visitor, context);

      // Add tslib imports before any other statement
      return tslibImports.length > 0
        ? ts.updateSourceFileNode(sfUpdated, [
          ...tslibImports,
          ...sfUpdated.statements,
        ])
        : sfUpdated;
    };

    return transformer;
  };
}

function createTslibImport(
  name: string,
  aliases?: string,
  useRequire = false,
): ts.VariableStatement | ts.ImportDeclaration {
  if (useRequire) {
    // Use `var __helper = /*@__PURE__*/ require("tslib").__helper`.
    const requireCall = ts.createCall(ts.createIdentifier('require'), undefined,
      [ts.createLiteral('tslib')]);
    const pureRequireCall = ts.addSyntheticLeadingComment(
      requireCall, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', false);
    const helperAccess = ts.createPropertyAccess(pureRequireCall, name);
    const variableDeclaration = ts.createVariableDeclaration(aliases || name, undefined, helperAccess);
    const variableStatement = ts.createVariableStatement(undefined, [variableDeclaration]);

    return variableStatement;
  } else {
    // Use `import { __helper } from "tslib"`.
    const namedImports = ts.createNamedImports([
      ts.createImportSpecifier(aliases ? ts.createIdentifier(name) : undefined, ts.createIdentifier(aliases || name)),
    ]);
    const importClause = ts.createImportClause(undefined, namedImports);
    const newNode = ts.createImportDeclaration(undefined, undefined, importClause,
      ts.createLiteral('tslib'));

    return newNode;
  }
}
