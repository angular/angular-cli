/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { elideImports } from './elide_imports';

export function removeIvyJitSupportCalls(
  classMetadata: boolean,
  ngModuleScope: boolean,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const removedNodes: ts.Node[] = [];

    const visitNode: ts.Visitor = (node: ts.Node) => {
      const innerStatement = ts.isExpressionStatement(node) && getIifeStatement(node);
      if (innerStatement) {
        if (
          ngModuleScope &&
          ts.isBinaryExpression(innerStatement.expression) &&
          isIvyPrivateCallExpression(innerStatement.expression.right, 'ɵɵsetNgModuleScope')
        ) {
          removedNodes.push(innerStatement);

          return undefined;
        }

        if (classMetadata) {
          const expression = ts.isBinaryExpression(innerStatement.expression)
            ? innerStatement.expression.right
            : innerStatement.expression;
          if (isIvyPrivateCallExpression(expression, 'ɵsetClassMetadata')) {
            removedNodes.push(innerStatement);

            return undefined;
          }
        }
      }

      return ts.visitEachChild(node, visitNode, context);
    };

    return (sourceFile: ts.SourceFile) => {
      let updatedSourceFile = ts.visitEachChild(sourceFile, visitNode, context);

      if (removedNodes.length > 0) {
        // Remove any unused imports
        const importRemovals = elideImports(
          updatedSourceFile,
          removedNodes,
          getTypeChecker,
          context.getCompilerOptions(),
        );
        if (importRemovals.size > 0) {
          updatedSourceFile = ts.visitEachChild(
            updatedSourceFile,
            function visitForRemoval(node): ts.Node | undefined {
              return importRemovals.has(node)
                ? undefined
                : ts.visitEachChild(node, visitForRemoval, context);
            },
            context,
          );
        }
      }

      return updatedSourceFile;
    };
  };
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
