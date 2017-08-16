/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { collectDeepNodes, drilldownNodes } from '../helpers/ast-utils';


export function testWrapEnums(content: string) {
  const regexes = [
    // tslint:disable:max-line-length
    /var (\S+) = \{\};\r?\n(\1\.(\S+) = \d+;\r?\n)+\1\[\1\.(\S+)\] = "\4";\r?\n(\1\[\1\.(\S+)\] = "\S+";\r?\n*)+/,
    /var (\S+);(\/\*@__PURE__\*\/)*\r?\n\(function \(\1\) \{\s+(\1\[\1\["(\S+)"\] = 0\] = "\4";(\s+\1\[\1\["\S+"\] = \d\] = "\S+";)*\r?\n)\}\)\(\1 \|\| \(\1 = \{\}\)\);/,
  // tslint:enable:max-line-length
  ];

  return regexes.some((regex) => regex.test(content));
}

interface EnumData {
  name: string;
  hostNode: ts.Node;
  statements: ts.ExpressionStatement[];
  dropNodes: ts.Node[];
}

export function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const enums = findEnumDeclarations(sf);
      const dropNodes = enums.reduce((acc: ts.Node[], curr) => acc.concat(curr.dropNodes), []);

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        const enumData = enums.find((e) => e.hostNode === node);
        if (enumData) {
          // Replace node with a wrapped enum.
          return ts.visitEachChild(createWrappedEnum(enumData), visitor, context);
        }

        // Drop enum nodes we relocated.
        if (dropNodes.find((n) => n === node)) {
          // According to @mhegazy returning undefined is supported.
          // https://github.com/Microsoft/TypeScript/pull/17044
          // tslint:disable-next-line:no-any
          return undefined as any;
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };

    return transformer;
  };
}


// Find all enum declarations, build a EnumData for each.
function findEnumDeclarations(sourceFile: ts.SourceFile): EnumData[] {
  const enums: EnumData[] = [];

  const enumHoldingNodes = [
    sourceFile,
    ...collectDeepNodes<ts.Block>(sourceFile, ts.SyntaxKind.Block),
  ];

  enumHoldingNodes.forEach((node) => {

    const stmts = node.statements;

    stmts.forEach((stmt, idx) => {
      // We're looking for a variable statement with more statements after it.
      if (idx >= stmts.length - 1
        || stmt.kind !== ts.SyntaxKind.VariableStatement) {
        return;
      }

      const varStmt = stmt as ts.VariableStatement;

      if (varStmt.declarationList.declarations.length !== 1) {
        return;
      }

      // We've found a single variable declaration statement, it might be the start of an enum.
      const maybeHostNode = varStmt;
      const varDecl = maybeHostNode.declarationList.declarations[0];

      if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
        return;
      }

      const maybeName = (varDecl.name as ts.Identifier).text;
      const enumStatements: ts.ExpressionStatement[] = [], enumDropNodes: ts.Node[] = [];

      // Try to figure out the enum type from the variable declaration.
      if (!varDecl.initializer) {
        // Typescript 2.3 enums have no initializer.
        const nextStatement = stmts[idx + 1];
        enumStatements.push(...findTs2_3EnumStatements(maybeName, nextStatement));
        enumDropNodes.push(nextStatement);
      } else if (varDecl.initializer
          && varDecl.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression
          && (varDecl.initializer as ts.ObjectLiteralExpression).properties.length === 0) {
        // Typescript 2.2 enums have a {} initializer.
        const nextStatements = stmts.slice(idx + 1);
        const statements = findTs2_2EnumStatements(maybeName, nextStatements);
        // We have to create new statements so we can keep new ones and drop old ones.
        enumStatements.push(...statements.map(stmt => ts.createStatement(stmt.expression)));
        enumDropNodes.push(...statements);
      } else {
        return;
      }

      if (enumStatements.length === 0) {
        return;
      }

      enums.push({
        name: maybeName,
        hostNode: maybeHostNode,
        statements: enumStatements,
        dropNodes: enumDropNodes,
      });
    });
  });

  return enums;
}

// TS 2.3 enums have statements are inside a IIFE.
function findTs2_3EnumStatements(name: string, statement: ts.Statement): ts.ExpressionStatement[] {
  const enumStatements: ts.ExpressionStatement[] = [];
  const noNodes: ts.ExpressionStatement[] = [];

  const funcExpr = drilldownNodes<ts.FunctionExpression>(statement,
    [
      { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
      { prop: 'expression', kind: ts.SyntaxKind.CallExpression },
      { prop: 'expression', kind: ts.SyntaxKind.ParenthesizedExpression },
      { prop: 'expression', kind: ts.SyntaxKind.FunctionExpression },
    ]);

  if (funcExpr === null) { return noNodes; }

  if (!(
    funcExpr.parameters.length === 1
    && funcExpr.parameters[0].name.kind === ts.SyntaxKind.Identifier
    && (funcExpr.parameters[0].name as ts.Identifier).text === name
  )) {
    return noNodes;
  }

  // In TS 2.3 enums, the IIFE contains only expressions with a certain format.
  // If we find any that is different, we ignore the whole thing.
  for (const innerStmt of funcExpr.body.statements) {

    const innerBinExpr = drilldownNodes<ts.BinaryExpression>(innerStmt,
      [
        { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
        { prop: 'expression', kind: ts.SyntaxKind.BinaryExpression },
      ]);

    if (innerBinExpr === null) { return noNodes; }

    const exprStmt = innerStmt as ts.ExpressionStatement;

    if (!(innerBinExpr.operatorToken.kind === ts.SyntaxKind.FirstAssignment
        && innerBinExpr.left.kind === ts.SyntaxKind.ElementAccessExpression)) {
      return noNodes;
    }

    const innerElemAcc = innerBinExpr.left as ts.ElementAccessExpression;

    if (!(
      innerElemAcc.expression.kind === ts.SyntaxKind.Identifier
      && (innerElemAcc.expression as ts.Identifier).text === name
      && innerElemAcc.argumentExpression
      && innerElemAcc.argumentExpression.kind === ts.SyntaxKind.BinaryExpression
    )) {
      return noNodes;
    }

    const innerArgBinExpr = innerElemAcc.argumentExpression as ts.BinaryExpression;

    if (innerArgBinExpr.left.kind !== ts.SyntaxKind.ElementAccessExpression) {
      return noNodes;
    }

    const innerArgElemAcc = innerArgBinExpr.left as ts.ElementAccessExpression;

    if (!(
      innerArgElemAcc.expression.kind === ts.SyntaxKind.Identifier
      && (innerArgElemAcc.expression as ts.Identifier).text === name
    )) {
      return noNodes;
    }

    enumStatements.push(exprStmt);
  }

  return enumStatements;
}

// TS 2.2 enums have statements after the variable declaration, with index statements followed
// by value statements.
function findTs2_2EnumStatements(
  name: string,
  statements: ts.Statement[],
): ts.ExpressionStatement[] {
  const enumStatements: ts.ExpressionStatement[] = [];
  let beforeValueStatements = true;

  for (const stmt of statements) {
    // Ensure all statements are of the expected format and using the right identifer.
    // When we find a statement that isn't part of the enum, return what we collected so far.
    const binExpr = drilldownNodes<ts.BinaryExpression>(stmt,
      [
        { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
        { prop: 'expression', kind: ts.SyntaxKind.BinaryExpression },
      ]);

    if (binExpr === null
      || (binExpr.left.kind !== ts.SyntaxKind.PropertyAccessExpression
        && binExpr.left.kind !== ts.SyntaxKind.ElementAccessExpression)
    ) {
      return beforeValueStatements ? [] : enumStatements;
    }

    const exprStmt = stmt as ts.ExpressionStatement;
    const leftExpr = binExpr.left as ts.PropertyAccessExpression | ts.ElementAccessExpression;

    if (!(leftExpr.expression.kind === ts.SyntaxKind.Identifier
        && (leftExpr.expression as ts.Identifier).text === name)) {
      return beforeValueStatements ? [] : enumStatements;
    }

    if (!beforeValueStatements && leftExpr.kind === ts.SyntaxKind.PropertyAccessExpression) {
      // We shouldn't find index statements after value statements.
      return [];
    } else if (beforeValueStatements && leftExpr.kind === ts.SyntaxKind.ElementAccessExpression) {
      beforeValueStatements = false;
    }

    enumStatements.push(exprStmt);
  }

  return enumStatements;
}

function createWrappedEnum(enumData: EnumData): ts.Node {
  const pureFunctionComment = '@__PURE__';

  const { name, statements } = enumData;

  const innerVarStmt = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList([
      ts.createVariableDeclaration(name, undefined, ts.createObjectLiteral()),
    ]),
  );

  const innerReturn = ts.createReturn(ts.createIdentifier(name));

  const iife = ts.createCall(
    ts.createParen(
      ts.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        undefined,
        ts.createBlock([
          innerVarStmt,
          ...statements,
          innerReturn,
        ]),
      ),
    ),
    undefined,
    [],
  );

  // Create a new node with the pure comment before the variable declaration initializer.
  const outerVarStmt = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList([
      ts.createVariableDeclaration(
        name,
        undefined,
        ts.addSyntheticLeadingComment(
          iife, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false,
        ),
      ),
    ]),
  );

  return outerVarStmt;
}
