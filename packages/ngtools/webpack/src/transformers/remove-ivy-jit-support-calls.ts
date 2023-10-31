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
  debugInfo: boolean,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const removedNodes: ts.Node[] = [];

    const visitNode: ts.Visitor = (node: ts.Node) => {
      const innerExpression = ts.isExpressionStatement(node) ? getIifeExpression(node) : null;
      if (innerExpression) {
        if (
          ngModuleScope &&
          ts.isBinaryExpression(innerExpression) &&
          isIvyPrivateCallExpression(innerExpression.right, 'ɵɵsetNgModuleScope')
        ) {
          removedNodes.push(innerExpression);

          return undefined;
        }

        if (classMetadata) {
          const expression = ts.isBinaryExpression(innerExpression)
            ? innerExpression.right
            : innerExpression;
          if (
            isIvyPrivateCallExpression(expression, 'ɵsetClassMetadata') ||
            isIvyPrivateCallExpression(expression, 'ɵsetClassMetadataAsync')
          ) {
            removedNodes.push(innerExpression);

            return undefined;
          }
        }

        if (
          debugInfo &&
          ts.isBinaryExpression(innerExpression) &&
          isIvyPrivateCallExpression(innerExpression.right, 'ɵsetClassDebugInfo')
        ) {
          removedNodes.push(innerExpression);

          return undefined;
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
function getIifeExpression(exprStmt: ts.ExpressionStatement): null | ts.Expression {
  const expression = exprStmt.expression;
  if (!expression || !ts.isCallExpression(expression) || expression.arguments.length !== 0) {
    return null;
  }

  const parenExpr = expression;
  if (!ts.isParenthesizedExpression(parenExpr.expression)) {
    return null;
  }

  const funExpr = parenExpr.expression.expression;
  if (!ts.isFunctionExpression(funExpr) && !ts.isArrowFunction(funExpr)) {
    return null;
  }

  if (!ts.isBlock(funExpr.body)) {
    return funExpr.body;
  }

  const innerStmts = funExpr.body.statements;
  if (innerStmts.length !== 1) {
    return null;
  }

  const innerExprStmt = innerStmts[0];
  if (!ts.isExpressionStatement(innerExprStmt)) {
    return null;
  }

  return innerExprStmt.expression;
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

  if (propAccExpr.name.text !== name) {
    return false;
  }

  return true;
}
