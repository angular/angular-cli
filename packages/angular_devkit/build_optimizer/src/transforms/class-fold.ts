/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

interface ClassData {
  name: string;
  class: ts.VariableDeclaration;
  classFunction: ts.FunctionExpression;
  statements: StatementData[];
}

interface StatementData {
  expressionStatement: ts.ExpressionStatement;
  hostClass: ClassData;
}

export function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const classes = findClassDeclarations(sf);
      const statements = findClassStaticPropertyAssignments(sf, checker, classes);

      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        // Check if node is a statement to be dropped.
        if (statements.find((st) => st.expressionStatement === node)) {
          return undefined;
        }

        // Check if node is a class to add statements to.
        const clazz = classes.find((cl) => cl.classFunction === node);
        if (clazz) {
          const functionExpression = node as ts.FunctionExpression;

          const newExpressions = clazz.statements.map((st) =>
            ts.createStatement(st.expressionStatement.expression));

          // Create a new body with all the original statements, plus new ones,
          // plus return statement.
          const newBody = ts.createBlock([
            ...functionExpression.body.statements.slice(0, -1),
            ...newExpressions,
            ...functionExpression.body.statements.slice(-1),
          ]);

          const newNode = ts.createFunctionExpression(
            functionExpression.modifiers,
            functionExpression.asteriskToken,
            functionExpression.name,
            functionExpression.typeParameters,
            functionExpression.parameters,
            functionExpression.type,
            newBody,
          );

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };

    return transformer;
  };
}

function findClassDeclarations(node: ts.Node): ClassData[] {
  const classes: ClassData[] = [];
  // Find all class declarations, build a ClassData for each.
  ts.forEachChild(node, (child) => {
    if (child.kind !== ts.SyntaxKind.VariableStatement) {
      return;
    }
    const varStmt = child as ts.VariableStatement;
    if (varStmt.declarationList.declarations.length > 1) {
      return;
    }
    const varDecl = varStmt.declarationList.declarations[0];
    if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
      return;
    }
    const name = (varDecl.name as ts.Identifier).text;
    const expr = varDecl.initializer;
    if (!expr || expr.kind !== ts.SyntaxKind.ParenthesizedExpression) {
      return;
    }
    if ((expr as ts.ParenthesizedExpression).expression.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }
    const callExpr = (expr as ts.ParenthesizedExpression).expression as ts.CallExpression;
    if (callExpr.expression.kind !== ts.SyntaxKind.FunctionExpression) {
      return;
    }
    const fn = callExpr.expression as ts.FunctionExpression;
    if (fn.body.statements.length < 2) {
      return;
    }
    if (fn.body.statements[0].kind !== ts.SyntaxKind.FunctionDeclaration) {
      return;
    }
    const innerFn = fn.body.statements[0] as ts.FunctionDeclaration;
    if (fn.body.statements[fn.body.statements.length - 1].kind !== ts.SyntaxKind.ReturnStatement) {
      return;
    }
    if (!innerFn.name || innerFn.name.kind !== ts.SyntaxKind.Identifier) {
      return;
    }
    if ((innerFn.name as ts.Identifier).text !== name) {
      return;
    }
    classes.push({
      name,
      class: varDecl,
      classFunction: fn,
      statements: [],
    });
  });

  return classes;
}

function findClassStaticPropertyAssignments(
  node: ts.Node,
  checker: ts.TypeChecker,
  classes: ClassData[]): StatementData[] {

  const statements: StatementData[] = [];

  // Find each assignment outside of the declaration.
  ts.forEachChild(node, (child) => {
    if (child.kind !== ts.SyntaxKind.ExpressionStatement) {
      return;
    }
    const expressionStatement = child as ts.ExpressionStatement;
    if (expressionStatement.expression.kind !== ts.SyntaxKind.BinaryExpression) {
      return;
    }
    const binEx = expressionStatement.expression as ts.BinaryExpression;
    if (binEx.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
      return;
    }
    const propAccess = binEx.left as ts.PropertyAccessExpression;
    if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
      return;
    }

    const symbol = checker.getSymbolAtLocation(propAccess.expression);
    if (!symbol) {
      return;
    }

    const decls = symbol.declarations;
    if (decls == undefined || decls.length === 0) {
      return;
    }

    const hostClass = classes.find((clazz => decls.includes(clazz.class)));
    if (!hostClass) {
      return;
    }
    const statement: StatementData = { expressionStatement, hostClass };

    hostClass.statements.push(statement);
    statements.push(statement);
  });

  return statements;
}
