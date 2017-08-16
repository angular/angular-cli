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

  return regex.test(content);
}

export function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      // Check if module has CJS exports. If so, use 'require()' instead of 'import'.
      const useRequire = /exports.\S+\s*=/.test(sf.getText());

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Check if node is a TS helper declaration.
        if (isTsHelper(node)) {
          // Replace node with import for that helper.
          return ts.visitEachChild(createTslibImport(node, useRequire), visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };

    return transformer;
  };
}

function createTslibImport(node: ts.Node, useRequire = false): ts.Node {
  const name = getVariableStatementName(node);

  if (!name) {
    return node;
  }

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
    // typescript@2.4 is needed for a fix to the function parameter types of ts.createImportClause.
    // https://github.com/Microsoft/TypeScript/pull/15999
    // Hiding it from lint until we upgrade.
    // tslint:disable-next-line:no-any
    const importClause = (ts.createImportClause as any)(undefined, namedImports);
    const newNode = ts.createImportDeclaration(undefined, undefined, importClause,
      ts.createLiteral('tslib'));

    return newNode;
  }
}

function isTsHelper(node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.VariableStatement) {
    return false;
  }
  const varStmt = node as ts.VariableStatement;
  if (varStmt.declarationList.declarations.length > 1) {
    return false;
  }
  const varDecl = varStmt.declarationList.declarations[0];
  if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }

  const name = getVariableStatementName(node);

  if (!name) {
    return false;
  }

  // TODO: there are more helpers than these, should we replace them all?
  const tsHelpers = [
    '__extends',
    '__decorate',
    '__metadata',
    '__param',
  ];

  if (tsHelpers.indexOf(name) === -1) {
    return false;
  }

  // TODO: maybe add a few more checks, like checking the first part of the assignment.

  return true;
}

function getVariableStatementName(node: ts.Node) {
  const varStmt = node as ts.VariableStatement;
  if (varStmt.declarationList.declarations.length > 1) {
    return null;
  }
  const varDecl = varStmt.declarationList.declarations[0];
  if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
    return null;
  }

  const name = (varDecl.name as ts.Identifier).text;

  // node.getText() on a name that starts with two underscores will return three instead.
  return name.replace(/^___/, '__');
}
