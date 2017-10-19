/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


export function testPrefixClasses(content: string) {
  const exportVarSetter = /(?:export )?(?:var|const)\s+(\S+)\s*=\s*/;
  const multiLineComment = /\s*(?:\/\*[\s\S]*?\*\/)?\s*/;
  const newLine = /\s*\r?\n\s*/;

  const regexes = [
    [
      /^/,
      exportVarSetter, multiLineComment,
      /\(/, multiLineComment,
      /\s*function \(\) {/, newLine,
      multiLineComment,
      /function \1\([^\)]*\) \{/, newLine,
    ],
    [
      /^/,
      exportVarSetter, multiLineComment,
      /\(/, multiLineComment,
      /\s*function \(_super\) {/, newLine,
      /\w*__extends\(\w+, _super\);/,
    ],
  ].map(arr => new RegExp(arr.map(x => x.source).join(''), 'm'));

  return regexes.some((regex) => regex.test(content));
}

const superParameterName = '_super';
const extendsHelperName = '__extends';

export function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const pureFunctionComment = '@__PURE__';

      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {

        // Add pure comment to downleveled classes.
        if (isVariableStatement(node) && isDownleveledClass(node)) {
          const varDecl = node.declarationList.declarations[0];
          const varInitializer = varDecl.initializer as ts.Expression;

          // Update node with the pure comment before the variable declaration initializer.
          const newNode = ts.updateVariableStatement(
            node,
            node.modifiers,
            ts.updateVariableDeclarationList(
              node.declarationList,
              [
                ts.updateVariableDeclaration(
                  varDecl,
                  varDecl.name,
                  varDecl.type,
                  ts.addSyntheticLeadingComment(
                    varInitializer,
                    ts.SyntaxKind.MultiLineCommentTrivia,
                    pureFunctionComment,
                    false,
                  ),
                ),
              ],
            ),
          );

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitEachChild(sf, visitor, context);
    };

    return transformer;
  };
}

function isVariableStatement(node: ts.Node): node is ts.VariableStatement {
  return node.kind === ts.SyntaxKind.VariableStatement;
}

function isIdentifier(node: ts.Node): node is ts.Identifier {
  return node.kind === ts.SyntaxKind.Identifier;
}

function isExpressionStatement(node: ts.Node): node is ts.ExpressionStatement {
  return node.kind === ts.SyntaxKind.ExpressionStatement;
}

function isParenthesizedExpression(node: ts.Node): node is ts.ParenthesizedExpression {
  return node.kind === ts.SyntaxKind.ParenthesizedExpression;
}

function isCallExpression(node: ts.Node): node is ts.CallExpression {
  return node.kind === ts.SyntaxKind.CallExpression;
}

function isFunctionExpression(node: ts.Node): node is ts.FunctionExpression {
  return node.kind === ts.SyntaxKind.FunctionExpression;
}

function isArrowFunction(node: ts.Node): node is ts.ArrowFunction {
  return node.kind === ts.SyntaxKind.ArrowFunction;
}

function isFunctionDeclaration(node: ts.Node): node is ts.FunctionDeclaration {
  return node.kind === ts.SyntaxKind.FunctionDeclaration;
}

function isReturnStatement(node: ts.Node): node is ts.ReturnStatement {
  return node.kind === ts.SyntaxKind.ReturnStatement;
}

function isBlock(node: ts.Node): node is ts.Block {
  return node.kind === ts.SyntaxKind.Block;
}

function isClassDeclaration(node: ts.Node): node is ts.ClassDeclaration {
  return node.kind === ts.SyntaxKind.ClassDeclaration;
}

// Determine if a node matched the structure of a downleveled TS class.
function isDownleveledClass(node: ts.Node): boolean {

  if (!isVariableStatement(node)) {
    return false;
  }

  if (node.declarationList.declarations.length !== 1) {
    return false;
  }

  const variableDeclaration = node.declarationList.declarations[0];

  if (!isIdentifier(variableDeclaration.name)
      || !variableDeclaration.initializer) {
    return false;
  }

  let potentialClass = variableDeclaration.initializer;

  // TS 2.3 has an unwrapped class IIFE
  // TS 2.4 uses a function expression wrapper
  // TS 2.5 uses an arrow function wrapper
  if (isParenthesizedExpression(potentialClass)) {
    potentialClass = potentialClass.expression;
  }

  if (!isCallExpression(potentialClass) || potentialClass.arguments.length > 1) {
    return false;
  }

  let wrapperBody: ts.Block;
  if (isFunctionExpression(potentialClass.expression)) {
    wrapperBody = potentialClass.expression.body;
  } else if (isArrowFunction(potentialClass.expression)
             && isBlock(potentialClass.expression.body)) {
    wrapperBody = potentialClass.expression.body;
  } else {
    return false;
  }

  if (wrapperBody.statements.length === 0) {
    return false;
  }

  const functionExpression = potentialClass.expression;
  const functionStatements = wrapperBody.statements;

  // need a minimum of two for a function declaration and return statement
  if (functionStatements.length < 2) {
    return false;
  }

  // The variable name should be the class name.
  const className = variableDeclaration.name.text;

  const firstStatement = functionStatements[0];

  // find return statement - may not be last statement
  let returnStatement: ts.ReturnStatement | undefined;
  for (let i = functionStatements.length - 1; i > 0; i--) {
    if (isReturnStatement(functionStatements[i])) {
      returnStatement = functionStatements[i] as ts.ReturnStatement;
      break;
    }
  }

  if (returnStatement == undefined
      || returnStatement.expression == undefined
      || !isIdentifier(returnStatement.expression)) {
    return false;
  }

  if (functionExpression.parameters.length === 0) {
    // potential non-extended class or wrapped es2015 class
    return (isFunctionDeclaration(firstStatement) || isClassDeclaration(firstStatement))
           && firstStatement.name !== undefined
           && firstStatement.name.text === className
           && returnStatement.expression.text === firstStatement.name.text;
  } else if (functionExpression.parameters.length !== 1) {
    return false;
  }

  // Potential extended class

  const functionParameter = functionExpression.parameters[0];

  if (!isIdentifier(functionParameter.name) || functionParameter.name.text !== superParameterName) {
    return false;
  }

  if (functionStatements.length < 3) {
    return false;
  }

  if (!isExpressionStatement(firstStatement) || !isCallExpression(firstStatement.expression)) {
    return false;
  }

  const extendCallExpression = firstStatement.expression;

  if (!isIdentifier(extendCallExpression.expression)
      || !extendCallExpression.expression.text.endsWith(extendsHelperName)) {
    return false;
  }

  if (extendCallExpression.arguments.length === 0) {
    return false;
  }

  const lastArgument = extendCallExpression.arguments[extendCallExpression.arguments.length - 1];

  if (!isIdentifier(lastArgument) || lastArgument.text !== functionParameter.name.text) {
    return false;
  }

  const secondStatement = functionStatements[1];

  return isFunctionDeclaration(secondStatement)
         && secondStatement.name !== undefined
         && className.endsWith(secondStatement.name.text)
         && returnStatement.expression.text === secondStatement.name.text;
}
