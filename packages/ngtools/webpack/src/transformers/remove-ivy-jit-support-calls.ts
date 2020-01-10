/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { collectDeepNodes } from './ast_helpers';
import { RemoveNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';

export function removeIvyJitSupportCalls(
  classMetadata: boolean,
  ngModuleScope: boolean,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  const standardTransform: StandardTransform = function(sourceFile: ts.SourceFile) {
    const ops: TransformOperation[] = [];

    collectDeepNodes<ts.ExpressionStatement>(sourceFile, ts.SyntaxKind.ExpressionStatement)
      .filter(statement => {
        const innerStatement = getIifeStatement(statement);
        if (!innerStatement) {
          return false;
        }

        if (ngModuleScope && ts.isBinaryExpression(innerStatement.expression)) {
          return isIvyPrivateCallExpression(innerStatement.expression.right, 'ɵɵsetNgModuleScope');
        }

        return (
          classMetadata &&
          isIvyPrivateCallExpression(innerStatement.expression, 'ɵsetClassMetadata')
        );
      })
      .forEach(statement => ops.push(new RemoveNodeOperation(sourceFile, statement)));

    return ops;
  };

  return makeTransform(standardTransform, getTypeChecker);
}

// Each Ivy private call expression is inside an IIFE
function getIifeStatement(exprStmt: ts.ExpressionStatement): null | ts.ExpressionStatement {
  const expression = exprStmt.expression;
  if (!expression || !ts.isCallExpression(expression) || expression.arguments.length !== 0) {
    return null;
  }

  const parenExpr = expression;
  if (!ts.isParenthesizedExpression(parenExpr.expression)) {
    return null;
  }

  const funExpr = parenExpr.expression.expression;
  if (!ts.isFunctionExpression(funExpr)) {
    return null;
  }

  const innerStmts = funExpr.body.statements;
  if (innerStmts.length !== 1) {
    return null;
  }

  const innerExprStmt = innerStmts[0];
  if (!ts.isExpressionStatement(innerExprStmt)) {
    return null;
  }

  return innerExprStmt;
}

function isIvyPrivateCallExpression(expression: ts.Expression, name: string) {
  // Now we're in the IIFE and have the inner expression statement. We can check if it matches
  // a private Ivy call.
  if (!ts.isCallExpression(expression)) {
    return false;
  }

  const propAccExpr = expression.expression;
  if (!ts.isPropertyAccessExpression(propAccExpr)) {
    return false;
  }

  if (propAccExpr.name.text != name) {
    return false;
  }

  return true;
}
