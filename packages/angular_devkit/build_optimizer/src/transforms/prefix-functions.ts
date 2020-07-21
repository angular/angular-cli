/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { addPureComment, getCleanHelperName, hasPureComment } from '../helpers/ast-utils';

export function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const topLevelFunctions = findTopLevelFunctions(sf);

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        // Add pure function comment to top level functions.
        if (topLevelFunctions.has(node)) {
          const newNode = addPureComment(node);

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

export function findTopLevelFunctions(parentNode: ts.Node): Set<ts.Node> {
  const topLevelFunctions = new Set<ts.Node>();

  function cb(node: ts.Node) {
    // Stop recursing into this branch if it's a definition construct.
    // These are function expression, function declaration, class, or arrow function (lambda).
    // The body of these constructs will not execute when loading the module, so we don't
    // need to mark function calls inside them as pure.
    // Class static initializers in ES2015 are an exception we don't cover. They would need similar
    // processing as enums to prevent property setting from causing the class to be retained.
    if (ts.isFunctionLike(node)
      || ts.isClassLike(node)
      || ts.isArrowFunction(node)
      || ts.isMethodDeclaration(node)
    ) {
      return;
    }

    let noPureComment = !hasPureComment(node);
    let innerNode = node;
    while (innerNode && ts.isParenthesizedExpression(innerNode)) {
      innerNode = innerNode.expression;
      noPureComment = noPureComment && !hasPureComment(innerNode);
    }

    if (!innerNode) {
      return;
    }

    if ((ts.isFunctionExpression(innerNode) || ts.isArrowFunction(innerNode))
      && ts.isParenthesizedExpression(node)) {
        // pure functions can be wrapped in parentizes
        // we should not add pure comments to this sort of syntax.
        // example var foo = (() => x)
      return;
    }

    if (noPureComment) {
      if (ts.isNewExpression(innerNode)) {
        topLevelFunctions.add(node);
      } else if (ts.isCallExpression(innerNode)) {
        let expression: ts.Expression = innerNode.expression;

        if (ts.isIdentifier(expression) && getCleanHelperName(expression.text)) {
          return;
        }

        while (expression && ts.isParenthesizedExpression(expression)) {
          expression = expression.expression;
        }

        if (expression) {
          if (ts.isFunctionExpression(expression)) {
            // Skip IIFE's with arguments
            // This could be improved to check if there are any references to variables
            if (innerNode.arguments.length === 0) {
              topLevelFunctions.add(node);
            }
          } else {
            topLevelFunctions.add(node);
          }
        }
      }
    }

    ts.forEachChild(innerNode, cb);
  }

  ts.forEachChild(parentNode, cb);

  return topLevelFunctions;
}
