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
        if (topLevelFunctions.indexOf(node) !== -1) {
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

export function findTopLevelFunctions(parentNode: ts.Node): ts.Node[] {
  const topLevelFunctions: ts.Node[] = [];

  let previousNode: ts.Node;
  function cb(node: ts.Node) {
    // Stop recursing into this branch if it's a function expression or declaration
    if (node.kind === ts.SyntaxKind.FunctionDeclaration
      || node.kind === ts.SyntaxKind.FunctionExpression) {
      return;
    }

    // We need to check specially for IIFEs formatted as call expressions inside parenthesized
    // expressions: `(function() {}())` Their start pos doesn't include the opening paren
    // and must be adjusted.
    if (isIIFE(node)
        && previousNode.kind === ts.SyntaxKind.ParenthesizedExpression
        && node.parent
        && !hasPureComment(node.parent)) {
      topLevelFunctions.push(node.parent);
    } else if ((node.kind === ts.SyntaxKind.CallExpression
              || node.kind === ts.SyntaxKind.NewExpression)
        && !hasPureComment(node)
    ) {
      topLevelFunctions.push(node);
    }

    previousNode = node;

    ts.forEachChild(node, cb);
  }

  function isIIFE(node: ts.Node): boolean {
    return node.kind === ts.SyntaxKind.CallExpression
      // This check was in the old ngo but it doesn't seem to make sense with the typings.
      // TODO(filipesilva): ask Alex Rickabaugh about it.
      // && !(<ts.CallExpression>node).expression.text
      && (node as ts.CallExpression).expression.kind !== ts.SyntaxKind.PropertyAccessExpression;
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
  const leadingComment = ts.getSyntheticLeadingComments(node);

  return leadingComment && leadingComment.some((comment) => comment.text === pureFunctionComment);
}
