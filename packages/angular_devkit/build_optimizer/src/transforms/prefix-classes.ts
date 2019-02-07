/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { addPureComment } from '../helpers/ast-utils';

/**
 * @deprecated From 0.9.0
 */
export function testPrefixClasses(content: string) {
  const exportVarSetter = /(?:export )?(?:var|const)\s+(?:\S+)\s*=\s*/;
  const multiLineComment = /\s*(?:\/\*[\s\S]*?\*\/)?\s*/;
  const newLine = /\s*\r?\n\s*/;

  const regexes = [
    [
      /^/,
      exportVarSetter, multiLineComment,
      /\(/, multiLineComment,
      /\s*function \(\) {/, newLine,
      multiLineComment,
      /function (?:\S+)\([^\)]*\) \{/, newLine,
    ],
    [
      /^/,
      exportVarSetter, multiLineComment,
      /\(/, multiLineComment,
      /\s*function \(_super\) {/, newLine,
      /\S*\.?__extends\(\S+, _super\);/,
    ],
  ].map(arr => new RegExp(arr.map(x => x.source).join(''), 'm'));

  return regexes.some((regex) => regex.test(content));
}

const superParameterName = '_super';
const extendsHelperName = '__extends';

export function getPrefixClassesTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {

        // Add pure comment to downleveled classes.
        if (ts.isVariableStatement(node) && isDownleveledClass(node)) {
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
                  addPureComment(varInitializer),
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

// Determine if a node matched the structure of a downleveled TS class.
function isDownleveledClass(node: ts.Node): boolean {

  if (!ts.isVariableStatement(node)) {
    return false;
  }

  if (node.declarationList.declarations.length !== 1) {
    return false;
  }

  const variableDeclaration = node.declarationList.declarations[0];

  if (!ts.isIdentifier(variableDeclaration.name)
      || !variableDeclaration.initializer) {
    return false;
  }

  let potentialClass = variableDeclaration.initializer;

  // TS 2.3 has an unwrapped class IIFE
  // TS 2.4 uses a function expression wrapper
  // TS 2.5 uses an arrow function wrapper
  if (ts.isParenthesizedExpression(potentialClass)) {
    potentialClass = potentialClass.expression;
  }

  if (!ts.isCallExpression(potentialClass) || potentialClass.arguments.length > 1) {
    return false;
  }

  let wrapperBody: ts.Block;
  if (ts.isFunctionExpression(potentialClass.expression)) {
    wrapperBody = potentialClass.expression.body;
  } else if (ts.isArrowFunction(potentialClass.expression)
             && ts.isBlock(potentialClass.expression.body)) {
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

  const firstStatement = functionStatements[0];

  // find return statement - may not be last statement
  let returnStatement: ts.ReturnStatement | undefined;
  for (let i = functionStatements.length - 1; i > 0; i--) {
    if (ts.isReturnStatement(functionStatements[i])) {
      returnStatement = functionStatements[i] as ts.ReturnStatement;
      break;
    }
  }

  if (returnStatement == undefined
      || returnStatement.expression == undefined
      || !ts.isIdentifier(returnStatement.expression)) {
    return false;
  }

  if (functionExpression.parameters.length === 0) {
    // potential non-extended class or wrapped es2015 class
    return (ts.isFunctionDeclaration(firstStatement) || ts.isClassDeclaration(firstStatement))
           && firstStatement.name !== undefined
           && returnStatement.expression.text === firstStatement.name.text;
  } else if (functionExpression.parameters.length !== 1) {
    return false;
  }

  // Potential extended class

  const functionParameter = functionExpression.parameters[0];

  if (!ts.isIdentifier(functionParameter.name)
      || functionParameter.name.text !== superParameterName) {
    return false;
  }

  if (functionStatements.length < 3 || !ts.isExpressionStatement(firstStatement)) {
    return false;
  }

  if (!ts.isCallExpression(firstStatement.expression)) {
    return false;
  }

  const extendCallExpression = firstStatement.expression;

  let functionName;
  if (ts.isIdentifier(extendCallExpression.expression)) {
    functionName = extendCallExpression.expression.text;
  } else if (ts.isPropertyAccessExpression(extendCallExpression.expression)) {
    functionName = extendCallExpression.expression.name.text;
  }

  if (!functionName || !functionName.endsWith(extendsHelperName)) {
    return false;
  }

  if (extendCallExpression.arguments.length === 0) {
    return false;
  }

  const lastArgument = extendCallExpression.arguments[extendCallExpression.arguments.length - 1];

  if (!ts.isIdentifier(lastArgument) || lastArgument.text !== functionParameter.name.text) {
    return false;
  }

  const secondStatement = functionStatements[1];

  return ts.isFunctionDeclaration(secondStatement)
         && secondStatement.name !== undefined
         && returnStatement.expression.text === secondStatement.name.text;
}
