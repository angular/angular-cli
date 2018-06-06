/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


const pureFunctionComment = '@__PURE__';

export function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const topLevelFunctions = findTopLevelFunctions(sf);
      const pureImports = findPureImports(sf);
      const pureImportsComment = `* PURE_IMPORTS_START ${pureImports.join(',')} PURE_IMPORTS_END `;

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Add the pure imports comment to the first node.
        if (node.parent && node.parent.parent === undefined && node.pos === 0) {
          const newNode = ts.addSyntheticLeadingComment(
            node, ts.SyntaxKind.MultiLineCommentTrivia, pureImportsComment, true);

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Add pure function comment to top level functions.
        if (topLevelFunctions.has(node)) {
          const newNode = ts.addSyntheticLeadingComment(
            node, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false);

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
    if (ts.isFunctionDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isClassDeclaration(node)
      || ts.isArrowFunction(node)
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

    if (noPureComment) {
      if (ts.isNewExpression(innerNode)) {
        topLevelFunctions.add(node);
      } else if (ts.isCallExpression(innerNode)) {
        let expression: ts.Expression = innerNode.expression;
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

export function findPureImports(parentNode: ts.Node): string[] {
  const pureImports: string[] = [];
  ts.forEachChild(parentNode, cb);

  function cb(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration
      && (node as ts.ImportDeclaration).importClause) {

      // Save the path of the import transformed into snake case and remove relative paths.
      const moduleSpecifier = (node as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral;
      const pureImport = moduleSpecifier.text
        .replace(/[\/@\-]/g, '_')
        .replace(/^\.+/, '');
      pureImports.push(pureImport);
    }

    ts.forEachChild(node, cb);
  }

  return pureImports;
}

function hasPureComment(node: ts.Node) {
  if (!node) {
    return false;
  }
  const leadingComment = ts.getSyntheticLeadingComments(node);

  return leadingComment && leadingComment.some((comment) => comment.text === pureFunctionComment);
}
