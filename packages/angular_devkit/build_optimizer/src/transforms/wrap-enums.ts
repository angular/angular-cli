/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

function isBlockLike(node: ts.Node): node is ts.BlockLike {
  return node.kind === ts.SyntaxKind.Block
      || node.kind === ts.SyntaxKind.ModuleBlock
      || node.kind === ts.SyntaxKind.CaseClause
      || node.kind === ts.SyntaxKind.DefaultClause
      || node.kind === ts.SyntaxKind.SourceFile;
}

export function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const result = visitBlockStatements(sf.statements, context);

      return ts.updateSourceFileNode(sf, ts.setTextRange(result, sf.statements));
    };

    return transformer;
  };
}

function visitBlockStatements(
  statements: ts.NodeArray<ts.Statement>,
  context: ts.TransformationContext,
): ts.NodeArray<ts.Statement> {

  // copy of statements to modify; lazy initialized
  let updatedStatements: Array<ts.Statement> | undefined;

  const visitor: ts.Visitor = (node) => {
    if (isBlockLike(node)) {
      let result = visitBlockStatements(node.statements, context);
      if (result === node.statements) {
        return node;
      }
      result = ts.setTextRange(result, node.statements);
      switch (node.kind) {
        case ts.SyntaxKind.Block:
          return ts.updateBlock(node as ts.Block, result);
        case ts.SyntaxKind.ModuleBlock:
          return ts.updateModuleBlock(node as ts.ModuleBlock, result);
        case ts.SyntaxKind.CaseClause:
          const clause = node as ts.CaseClause;

          return ts.updateCaseClause(clause, clause.expression, result);
        case ts.SyntaxKind.DefaultClause:
          return ts.updateDefaultClause(node as ts.DefaultClause, result);
        default:
          return node;
      }
    } else {
      return ts.visitEachChild(node, visitor, context);
    }
  };

  // 'oIndex' is the original statement index; 'uIndex' is the updated statement index
  for (let oIndex = 0, uIndex = 0; oIndex < statements.length; oIndex++, uIndex++) {
    const currentStatement = statements[oIndex];

    // these can't contain an enum declaration
    if (currentStatement.kind === ts.SyntaxKind.ImportDeclaration) {
      continue;
    }

    // enum declarations must:
    //   * not be last statement
    //   * be a variable statement
    //   * have only one declaration
    //   * have an identifer as a declaration name
    if (oIndex < statements.length - 1
        && ts.isVariableStatement(currentStatement)
        && currentStatement.declarationList.declarations.length === 1) {

      const variableDeclaration = currentStatement.declarationList.declarations[0];
      if (ts.isIdentifier(variableDeclaration.name)) {
        const name = variableDeclaration.name.text;

        if (!variableDeclaration.initializer) {
          const iife = findTs2_3EnumIife(name, statements[oIndex + 1]);
          if (iife) {
            // found an enum
            if (!updatedStatements) {
              updatedStatements = statements.slice();
            }
            // update IIFE and replace variable statement and old IIFE
            updatedStatements.splice(uIndex, 2, updateEnumIife(
              currentStatement,
              iife[0],
              iife[1],
            ));
            // skip IIFE statement
            oIndex++;
            continue;
          }
        } else if (ts.isObjectLiteralExpression(variableDeclaration.initializer)
                   && variableDeclaration.initializer.properties.length === 0) {
          const enumStatements = findTs2_2EnumStatements(name, statements, oIndex + 1);
          if (enumStatements.length > 0) {
            // found an enum
            if (!updatedStatements) {
              updatedStatements = statements.slice();
            }
            // create wrapper and replace variable statement and enum member statements
            updatedStatements.splice(uIndex, enumStatements.length + 1, createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
              variableDeclaration.initializer,
            ));
            // skip enum member declarations
            oIndex += enumStatements.length;
            continue;
          }
        } else if (ts.isObjectLiteralExpression(variableDeclaration.initializer)
          && variableDeclaration.initializer.properties.length !== 0) {
          const literalPropertyCount = variableDeclaration.initializer.properties.length;
          const enumStatements = findEnumNameStatements(name, statements, oIndex + 1);
          if (enumStatements.length === literalPropertyCount) {
            // found an enum
            if (!updatedStatements) {
              updatedStatements = statements.slice();
            }
            // create wrapper and replace variable statement and enum member statements
            updatedStatements.splice(uIndex, enumStatements.length + 1, createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
              variableDeclaration.initializer,
            ));
            // skip enum member declarations
            oIndex += enumStatements.length;
            continue;
          }
        }
      }
    }

    const result = ts.visitNode(currentStatement, visitor);
    if (result !== currentStatement) {
      if (!updatedStatements) {
        updatedStatements = statements.slice();
      }
      updatedStatements[uIndex] = result;
    }
  }

  // if changes, return updated statements
  // otherwise, return original array instance
  return updatedStatements ? ts.createNodeArray(updatedStatements) : statements;
}

// TS 2.3 enums have statements that are inside a IIFE.
function findTs2_3EnumIife(
  name: string,
  statement: ts.Statement,
): [ts.CallExpression, ts.Expression | undefined] | null {
  if (!ts.isExpressionStatement(statement)) {
    return null;
  }

  let expression = statement.expression;
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }

  if (!expression || !ts.isCallExpression(expression) || expression.arguments.length !== 1) {
    return null;
  }

  const callExpression = expression;
  let exportExpression;

  let argument = expression.arguments[0];
  if (!ts.isBinaryExpression(argument)) {
    return null;
  }

  if (!ts.isIdentifier(argument.left) || argument.left.text !== name) {
    return null;
  }

  let potentialExport = false;
  if (argument.operatorToken.kind === ts.SyntaxKind.FirstAssignment) {
    if (!ts.isBinaryExpression(argument.right)
        || argument.right.operatorToken.kind !== ts.SyntaxKind.BarBarToken) {
      return null;
    }

    potentialExport = true;
    argument = argument.right;
  }

  if (!ts.isBinaryExpression(argument)) {
    return null;
  }

  if (argument.operatorToken.kind !== ts.SyntaxKind.BarBarToken) {
    return null;
  }

  if (potentialExport && !ts.isIdentifier(argument.left)) {
    exportExpression = argument.left;
  }

  expression = expression.expression;
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }

  if (!expression || !ts.isFunctionExpression(expression) || expression.parameters.length !== 1) {
    return null;
  }

  const parameter = expression.parameters[0];
  if (!ts.isIdentifier(parameter.name) || parameter.name.text !== name) {
    return null;
  }

  // In TS 2.3 enums, the IIFE contains only expressions with a certain format.
  // If we find any that is different, we ignore the whole thing.
  for (let bodyIndex = 0; bodyIndex < expression.body.statements.length; ++bodyIndex) {
    const bodyStatement = expression.body.statements[bodyIndex];

    if (!ts.isExpressionStatement(bodyStatement) || !bodyStatement.expression) {
      return null;
    }

    if (!ts.isBinaryExpression(bodyStatement.expression)
        || bodyStatement.expression.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
      return null;
    }

    const assignment = bodyStatement.expression.left;
    const value = bodyStatement.expression.right;
    if (!ts.isElementAccessExpression(assignment) || !ts.isStringLiteral(value)) {
      return null;
    }

    if (!ts.isIdentifier(assignment.expression) || assignment.expression.text !== name) {
      return null;
    }

    const memberArgument = assignment.argumentExpression;
    if (!memberArgument || !ts.isBinaryExpression(memberArgument)
        || memberArgument.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
      return null;
    }


    if (!ts.isElementAccessExpression(memberArgument.left)) {
      return null;
    }

    if (!ts.isIdentifier(memberArgument.left.expression)
        || memberArgument.left.expression.text !== name) {
      return null;
    }

    if (!memberArgument.left.argumentExpression
        || !ts.isStringLiteral(memberArgument.left.argumentExpression)) {
      return null;
    }

    if (memberArgument.left.argumentExpression.text !== value.text) {
      return null;
    }
  }

  return [callExpression, exportExpression];
}

// TS 2.2 enums have statements after the variable declaration, with index statements followed
// by value statements.
function findTs2_2EnumStatements(
  name: string,
  statements: ts.NodeArray<ts.Statement>,
  statementOffset: number,
): ts.Statement[] {
  const enumValueStatements: ts.Statement[] = [];
  const memberNames: string[] = [];

  let index = statementOffset;
  for (; index < statements.length; ++index) {
    // Ensure all statements are of the expected format and using the right identifer.
    // When we find a statement that isn't part of the enum, return what we collected so far.
    const current = statements[index];
    if (!ts.isExpressionStatement(current) || !ts.isBinaryExpression(current.expression)) {
      break;
    }

    const property = current.expression.left;
    if (!property || !ts.isPropertyAccessExpression(property)) {
      break;
    }

    if (!ts.isIdentifier(property.expression) || property.expression.text !== name) {
      break;
    }

    memberNames.push(property.name.text);
    enumValueStatements.push(current);
  }

  if (enumValueStatements.length === 0) {
    return [];
  }

  const enumNameStatements = findEnumNameStatements(name, statements, index, memberNames);
  if (enumNameStatements.length !== enumValueStatements.length) {
    return [];
  }

  return enumValueStatements.concat(enumNameStatements);
}

// Tsickle enums have a variable statement with indexes, followed by value statements.
// See https://github.com/angular/devkit/issues/229#issuecomment-338512056 fore more information.
function findEnumNameStatements(
  name: string,
  statements: ts.NodeArray<ts.Statement>,
  statementOffset: number,
  memberNames?: string[],
): ts.Statement[] {
  const enumStatements: ts.Statement[] = [];

  for (let index = statementOffset; index < statements.length; ++index) {
    // Ensure all statements are of the expected format and using the right identifer.
    // When we find a statement that isn't part of the enum, return what we collected so far.
    const current = statements[index];
    if (!ts.isExpressionStatement(current) || !ts.isBinaryExpression(current.expression)) {
      break;
    }

    const access = current.expression.left;
    const value = current.expression.right;
    if (!access || !ts.isElementAccessExpression(access) || !value || !ts.isStringLiteral(value)) {
      break;
    }

    if (memberNames && !memberNames.includes(value.text)) {
      break;
    }

    if (!ts.isIdentifier(access.expression) || access.expression.text !== name) {
      break;
    }

    if (!access.argumentExpression || !ts.isPropertyAccessExpression(access.argumentExpression)) {
      break;
    }

    const enumExpression = access.argumentExpression.expression;
    if (!ts.isIdentifier(enumExpression) || enumExpression.text !== name) {
      break;
    }

    if (value.text !== access.argumentExpression.name.text) {
      break;
    }

    enumStatements.push(current);
  }

  return enumStatements;
}

function addPureComment<T extends ts.Node>(node: T): T {
  const pureFunctionComment = '@__PURE__';

  return ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.MultiLineCommentTrivia,
    pureFunctionComment,
    false,
  );
}

function updateHostNode(
  hostNode: ts.VariableStatement,
  expression: ts.Expression,
): ts.Statement {

  // Update existing host node with the pure comment before the variable declaration initializer.
  const variableDeclaration = hostNode.declarationList.declarations[0];
  const outerVarStmt = ts.updateVariableStatement(
    hostNode,
    hostNode.modifiers,
    ts.updateVariableDeclarationList(
      hostNode.declarationList,
      [
        ts.updateVariableDeclaration(
          variableDeclaration,
          variableDeclaration.name,
          variableDeclaration.type,
          expression,
        ),
      ],
    ),
  );

  return outerVarStmt;
}

function updateEnumIife(
  hostNode: ts.VariableStatement,
  iife: ts.CallExpression,
  exportAssignment?: ts.Expression,
): ts.Statement {
  if (!ts.isParenthesizedExpression(iife.expression)
      || !ts.isFunctionExpression(iife.expression.expression)) {
    throw new Error('Invalid IIFE Structure');
  }

  // Ignore export assignment if variable is directly exported
  if (hostNode.modifiers
      && hostNode.modifiers.findIndex(m => m.kind == ts.SyntaxKind.ExportKeyword) != -1) {
    exportAssignment = undefined;
  }

  const expression = iife.expression.expression;
  const updatedFunction = ts.updateFunctionExpression(
    expression,
    expression.modifiers,
    expression.asteriskToken,
    expression.name,
    expression.typeParameters,
    expression.parameters,
    expression.type,
    ts.updateBlock(
      expression.body,
      [
        ...expression.body.statements,
        ts.createReturn(expression.parameters[0].name as ts.Identifier),
      ],
    ),
  );

  let arg: ts.Expression = ts.createObjectLiteral();
  if (exportAssignment) {
    arg = ts.createBinary(exportAssignment, ts.SyntaxKind.BarBarToken, arg);
  }
  const updatedIife = ts.updateCall(
    iife,
    ts.updateParen(
      iife.expression,
      updatedFunction,
    ),
    iife.typeArguments,
    [arg],
  );

  let value: ts.Expression = addPureComment(updatedIife);
  if (exportAssignment) {
    value = ts.createBinary(
      exportAssignment,
      ts.SyntaxKind.FirstAssignment,
      updatedIife);
  }

  return updateHostNode(hostNode, value);
}

function createWrappedEnum(
  name: string,
  hostNode: ts.VariableStatement,
  statements: Array<ts.Statement>,
  literalInitializer: ts.ObjectLiteralExpression | undefined,
): ts.Statement {
  literalInitializer = literalInitializer || ts.createObjectLiteral();
  const innerVarStmt = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList([
      ts.createVariableDeclaration(name, undefined, literalInitializer),
    ]),
  );

  const innerReturn = ts.createReturn(ts.createIdentifier(name));

  const iife = ts.createImmediatelyInvokedFunctionExpression([
    innerVarStmt,
    ...statements,
    innerReturn,
  ]);

  return updateHostNode(hostNode, addPureComment(ts.createParen(iife)));
}
