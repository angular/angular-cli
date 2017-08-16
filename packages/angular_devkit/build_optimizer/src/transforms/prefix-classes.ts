/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


export function testPrefixClasses(content: string) {
  const regexes = [
    // tslint:disable-next-line:max-line-length
    /^(var (\S+) = )(\(function \(\) \{\r?\n(?:    (?:\/\*\*| \*|\*\/|\/\/)[^\r?\n]*\r?\n)*    function \2\([^\)]*\) \{\r?\n)/,
    /^(var (\S+) = )(\(function \(_super\) \{\r?\n    \w*__extends\(\w+, _super\);\r?\n)/,
  ];

  return regexes.some((regex) => regex.test(content));
}

export function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const pureFunctionComment = '@__PURE__';

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Add pure comment to downleveled classes.
        if (isDownleveledClass(node)) {
          const varDecl = node as ts.VariableDeclaration;
          const varDeclInit = varDecl.initializer as ts.Expression;

          // Create a new node with the pure comment before the variable declaration initializer.
          const newNode = ts.createVariableDeclaration(
            varDecl.name,
            undefined,
            ts.addSyntheticLeadingComment(
              varDeclInit, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false,
            ),
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

// Determine if a node matched the structure of a downleveled TS class.
function isDownleveledClass(node: ts.Node): boolean {
  let isExtendedClass = false;

  if (node.kind !== ts.SyntaxKind.VariableDeclaration) {
    return false;
  }

  const varDecl = node as ts.VariableDeclaration;

  if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }

  // The variable name should be the class name.
  const className = (varDecl.name as ts.Identifier).text;

  if (!varDecl.initializer || varDecl.initializer.kind !== ts.SyntaxKind.ParenthesizedExpression) {
    return false;
  }

  const parenExpr = varDecl.initializer as ts.ParenthesizedExpression;

  if (parenExpr.expression.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }

  const callExpr = parenExpr.expression as ts.CallExpression;

  if (callExpr.expression.kind !== ts.SyntaxKind.FunctionExpression) {
    return false;
  }

  const funcExpr = callExpr.expression as ts.FunctionExpression;

  // Extended classes have the `_super` parameter.
  if (funcExpr.parameters.length === 1
    && (funcExpr.parameters[0].name as ts.Identifier).text === '_super') {
    isExtendedClass = true;
  }

  // IIFE inner parameters should be empty or `_super`.
  if (funcExpr.parameters.length !== 0 && !isExtendedClass) {
    return false;
  }

  const stmts = funcExpr.body.statements;

  if (stmts.length === 0) {
    return false;
  }

  const firstStatement = stmts[0];

  // Check if `node` is a FunctionDeclaration named `name`.
  function isFunDeclNamed(node: ts.Node, name: string) {
    if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
      const funcDecl = node as ts.FunctionDeclaration;
      if (funcDecl.name && funcDecl.name.text === name) {
        return true;
      }
    } else {
      return false;
    }
  }

  // If the class is extending another, the first statement is a _extends(..., _super) call.
  if (isExtendedClass) {
    if (firstStatement.kind !== ts.SyntaxKind.ExpressionStatement) {
      return false;
    }
    const exprStmt = firstStatement as ts.ExpressionStatement;

    if (exprStmt.expression.kind !== ts.SyntaxKind.CallExpression) {
      return false;
    }

    const extendsCallExpr = exprStmt.expression as ts.CallExpression;

    // Function should be called `__extends`.
    if (extendsCallExpr.expression.kind !== ts.SyntaxKind.Identifier) {
      return false;
    }

    const callExprName = (extendsCallExpr.expression as ts.Identifier).text;

    // Reserved TS names are retrieved with three underscores instead of two.
    if (callExprName !== '___extends') {
      return false;
    }

    // Function should have 1+ arguments, with the last being named `_super`.
    if (extendsCallExpr.arguments.length === 0) {
      return false;
    }

    const lastArg = extendsCallExpr.arguments[extendsCallExpr.arguments.length - 1];

    if (lastArg.kind !== ts.SyntaxKind.Identifier) {
      return false;
    }

    const lastArgName = (lastArg as ts.Identifier).text;

    if (lastArgName !== '_super') {
      return false;
    }

    const secondStatement = stmts[1];

    if (secondStatement && isFunDeclNamed(secondStatement, className)) {
      // This seems to be downleveled class that extends another class.
      return true;
    }

  } else if (isFunDeclNamed(firstStatement, className)) {
    // This seems to be downleveled class.
    return true;
  }

  return false;
}
