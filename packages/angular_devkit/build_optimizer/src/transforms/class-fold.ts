/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { addPureComment } from '../helpers/ast-utils';

interface ClassData {
  name: string;
  declaration: ts.VariableDeclaration | ts.ClassDeclaration;
  function?: ts.FunctionExpression;
  statements: StatementData[];
}

interface StatementData {
  expressionStatement: ts.ExpressionStatement;
  hostClass: ClassData;
}

/** @deprecated Since version 8 */
export function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const statementsToRemove: ts.ExpressionStatement[] = [];
      const classesWithoutStatements = findClassDeclarations(sf);
      let classes = findClassesWithStaticPropertyAssignments(sf, checker, classesWithoutStatements);

      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (classes.length === 0 && statementsToRemove.length === 0) {
          // There are no more statements to fold.
          return ts.visitEachChild(node, visitor, context);
        }

        // Check if node is a statement to be dropped.
        const stmtIdx = statementsToRemove.indexOf(node as ts.ExpressionStatement);
        if (stmtIdx != -1) {
          statementsToRemove.splice(stmtIdx, 1);

          return undefined;
        }

        // Check if node is a ES5 class to add statements to.
        let clazz = classes.find((cl) => cl.function === node);
        if (clazz) {
          const functionExpression = node as ts.FunctionExpression;

          // Create a new body with all the original statements, plus new ones,
          // plus return statement.
          const newBody = ts.createBlock([
            ...functionExpression.body.statements.slice(0, -1),
            ...clazz.statements.map(st => st.expressionStatement),
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

          // Update remaining classes and statements.
          statementsToRemove.push(...clazz.statements.map(st => st.expressionStatement));
          classes = classes.filter(cl => cl != clazz);

          // Replace node with modified one.
          return newNode;
        }

        // Check if node is a ES2015 class to replace with a pure IIFE.
        clazz = classes.find((cl) => !cl.function && cl.declaration === node);
        if (clazz) {
          const classStatement = clazz.declaration as ts.ClassDeclaration;
          const innerReturn = ts.createReturn(ts.createIdentifier(clazz.name));

          const pureIife = addPureComment(
            ts.createImmediatelyInvokedFunctionExpression([
              classStatement,
              ...clazz.statements.map(st => st.expressionStatement),
              innerReturn,
            ]));

          // Move the original class modifiers to the var statement.
          const newNode = ts.createVariableStatement(
            clazz.declaration.modifiers,
            ts.createVariableDeclarationList([
              ts.createVariableDeclaration(clazz.name, undefined, pureIife),
            ], ts.NodeFlags.Const),
          );
          clazz.declaration.modifiers = undefined;

          // Update remaining classes and statements.
          statementsToRemove.push(...clazz.statements.map(st => st.expressionStatement));
          classes = classes.filter(cl => cl != clazz);

          return newNode;
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
    // Check if it is a named class declaration first.
    // Technically it doesn't need a name in TS if it's the default export, but when downleveled
    // it will be have a name (e.g. `default_1`).
    if (ts.isClassDeclaration(child) && child.name) {
      classes.push({
        name: child.name.text,
        declaration: child,
        statements: [],
      });

      return;
    }

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
      declaration: varDecl,
      function: fn,
      statements: [],
    });
  });

  return classes;
}

function findClassesWithStaticPropertyAssignments(
  node: ts.Node,
  checker: ts.TypeChecker,
  classes: ClassData[],
) {
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

    const hostClass = classes.find((clazz => decls.includes(clazz.declaration)));
    if (!hostClass) {
      return;
    }
    const statement: StatementData = { expressionStatement, hostClass };

    hostClass.statements.push(statement);
  });

  // Only return classes that have static property assignments.
  return classes.filter(cl => cl.statements.length != 0);
}
