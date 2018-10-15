/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

const tsHelpers = [
  '__extends',
  '__assign',
  '__rest',
  '__decorate',
  '__param',
  '__metadata',
  '__awaiter',
  '__generator',
  '__exportStar',
  '__values',
  '__read',
  '__spread',
  '__await',
  '__asyncGenerator',
  '__asyncDelegator',
  '__asyncValues',
  '__makeTemplateObject',
  '__importStar',
  '__importDefault',
];

const tsHelpersRegExp = new RegExp(`var (${tsHelpers.join('|')}) = \\(.*\r?\n(    .*\r?\n)*\};`);

/**
 * @deprecated From 0.9.0
 */
export function testImportTslib(content: string) {
  return tsHelpersRegExp.test(content);
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
            const name = (declarations[0].name as ts.Identifier).text;

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
  return tsHelpers.indexOf(name) !== -1;
}
