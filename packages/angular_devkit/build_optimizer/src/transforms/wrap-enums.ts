/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { addPureComment } from '../helpers/ast-utils';

function isBlockLike(node: ts.Node): node is ts.BlockLike {
  return node.kind === ts.SyntaxKind.Block
      || node.kind === ts.SyntaxKind.ModuleBlock
      || node.kind === ts.SyntaxKind.CaseClause
      || node.kind === ts.SyntaxKind.DefaultClause
      || node.kind === ts.SyntaxKind.SourceFile;
}

export function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = sf => {
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
          return ts.updateBlock(node, result);
        case ts.SyntaxKind.ModuleBlock:
          return ts.updateModuleBlock(node, result);
        case ts.SyntaxKind.CaseClause:
          return ts.updateCaseClause(node, node.expression, result);
        case ts.SyntaxKind.DefaultClause:
          return ts.updateDefaultClause(node, result);
        default:
          return node;
      }
    } else {
      return ts.visitEachChild(node, visitor, context);
    }
  };

  // 'oIndex' is the original statement index; 'uIndex' is the updated statement index
  for (let oIndex = 0, uIndex = 0; oIndex < statements.length - 1; oIndex++, uIndex++) {
    const currentStatement = statements[oIndex];
    let newStatement: ts.Statement[] | undefined;
    let oldStatementsLength = 0;

    // these can't contain an enum declaration
    if (currentStatement.kind === ts.SyntaxKind.ImportDeclaration) {
      continue;
    }

    // enum declarations must:
    //   * not be last statement
    //   * be a variable statement
    //   * have only one declaration
    //   * have an identifer as a declaration name

    // ClassExpression declarations must:
    //   * not be last statement
    //   * be a variable statement
    //   * have only one declaration
    //   * have an ClassExpression or BinaryExpression and a right
    //     of kind ClassExpression as a initializer
    if (ts.isVariableStatement(currentStatement)
      && currentStatement.declarationList.declarations.length === 1) {

      const variableDeclaration = currentStatement.declarationList.declarations[0];
      const initializer = variableDeclaration.initializer;
      if (ts.isIdentifier(variableDeclaration.name)) {
        const name = variableDeclaration.name.text;

        if (!initializer) {
          const iife = findTs2_3EnumIife(name, statements[oIndex + 1]);
          if (iife) {
            // update IIFE and replace variable statement and old IIFE
            oldStatementsLength = 2;
            newStatement = updateEnumIife(
              currentStatement,
              iife[0],
              iife[1],
            );
            // skip IIFE statement
            oIndex++;
          }
        } else if (ts.isObjectLiteralExpression(initializer)
                   && initializer.properties.length === 0) {
          const enumStatements = findTs2_2EnumStatements(name, statements, oIndex + 1);
          if (enumStatements.length > 0) {
            // create wrapper and replace variable statement and enum member statements
            oldStatementsLength = enumStatements.length + 1;
            newStatement = createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
              initializer,
            );
            // skip enum member declarations
            oIndex += enumStatements.length;
          }
        } else if (ts.isObjectLiteralExpression(initializer)
          && initializer.properties.length !== 0) {
          const literalPropertyCount = initializer.properties.length;

          // tsickle es2015 enums first statement is an export declaration
          const isPotentialEnumExport = ts.isExportDeclaration(statements[oIndex + 1]);
          if (isPotentialEnumExport) {
            // skip the export
            oIndex ++;
          }

          const enumStatements = findEnumNameStatements(name, statements, oIndex + 1);
          if (enumStatements.length === literalPropertyCount) {
            // create wrapper and replace variable statement and enum member statements
            oldStatementsLength = enumStatements.length + (isPotentialEnumExport ? 2 : 1);
            newStatement = createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
              initializer,
              isPotentialEnumExport,
            );
            // skip enum member declarations
            oIndex += enumStatements.length;
          }
        } else if (
          ts.isClassExpression(initializer)
          || (
            ts.isBinaryExpression(initializer)
            && ts.isClassExpression(initializer.right)
          )
        ) {
          const classStatements = findClassStatements(name, statements, oIndex);
          if (!classStatements) {
            continue;
          }

          oldStatementsLength = classStatements.length;
          newStatement = createWrappedClass(
            variableDeclaration,
            classStatements,
          );

          oIndex += classStatements.length - 1;
        }
      }
    } else if (ts.isClassDeclaration(currentStatement)) {
      const name = (currentStatement.name as ts.Identifier).text;
      const classStatements = findClassStatements(name, statements, oIndex);
      if (!classStatements) {
        continue;
      }

      oldStatementsLength = classStatements.length;
      newStatement = createWrappedClass(
        currentStatement,
        classStatements,
      );

      oIndex += classStatements.length - 1;
    }

    if (newStatement && newStatement.length > 0) {
      if (!updatedStatements) {
        updatedStatements = [...statements];
      }

      updatedStatements.splice(uIndex, oldStatementsLength, ...newStatement);
      // When having more than a single new statement
      // we need to update the update Index
      uIndex += (newStatement ? newStatement.length - 1 : 0);
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
  if (!ts.isIdentifier(parameter.name)) {
    return null;
  }

  // The name of the parameter can be different than the name of the enum if it was renamed
  // due to scope hoisting.
  const parameterName = parameter.name.text;

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

    if (!ts.isIdentifier(assignment.expression) || assignment.expression.text !== parameterName) {
      return null;
    }

    const memberArgument = assignment.argumentExpression;
    // String enum
    if (ts.isStringLiteral(memberArgument)) {
      return [callExpression, exportExpression];
    }

    // Non string enums
    if (!ts.isBinaryExpression(memberArgument)
      || memberArgument.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
      return null;
    }

    if (!ts.isElementAccessExpression(memberArgument.left)) {
      return null;
    }

    if (!ts.isIdentifier(memberArgument.left.expression)
      || memberArgument.left.expression.text !== parameterName) {
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

/**
 * Find class expression or declaration statements.
 *
 * The classExpressions block to wrap in an iife must
 * - end with an ExpressionStatement
 * - it's expression must be a BinaryExpression
 * - have the same name
 *
 * ```
 let Foo = class Foo {};
 Foo = __decorate([]);
 ```
 */
function findClassStatements(
  name: string,
  statements: ts.NodeArray<ts.Statement>,
  statementIndex: number,
): ts.Statement[] | undefined {
  let count = 1;

  for (let index = statementIndex + 1; index < statements.length; ++index) {
    const statement = statements[index];
    if (!ts.isExpressionStatement(statement)) {
      break;
    }

    const expression = statement.expression;

    if (ts.isCallExpression(expression)) {
    // Ex:
    // setClassMetadata(FooClass, [{}], void 0);
    // __decorate([propDecorator()], FooClass.prototype, "propertyName", void 0);
    // __decorate([propDecorator()], FooClass, "propertyName", void 0);
    // __decorate$1([propDecorator()], FooClass, "propertyName", void 0);
      const args = expression.arguments;

      if (args.length > 2) {
        const isReferenced = args.some(arg => {
          const potentialIdentifier = ts.isPropertyAccessExpression(arg) ? arg.expression : arg;

          return ts.isIdentifier(potentialIdentifier) && potentialIdentifier.text === name;
        });

        if (isReferenced) {
          count++;
          continue;
        }
      }
    } else if (ts.isBinaryExpression(expression)) {
      const node = ts.isBinaryExpression(expression.left)
        ? expression.left.left
        : expression.left;

      const leftExpression = ts.isPropertyAccessExpression(node)
        // Static Properties // Ex: Foo.bar = 'value';
        ? node.expression
        // Ex: FooClass = __decorate([Component()], FooClass);
        : node;

      if (ts.isIdentifier(leftExpression) && leftExpression.text === name) {
        count++;
        continue;
      }
    }

    break;
  }

  if (count > 1) {
    return statements.slice(statementIndex, statementIndex + count);
  }

  return undefined;
}

function updateEnumIife(
  hostNode: ts.VariableStatement,
  iife: ts.CallExpression,
  exportAssignment?: ts.Expression,
): ts.Statement[] {
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

  return [updateHostNode(hostNode, value)];
}

function createWrappedEnum(
  name: string,
  hostNode: ts.VariableStatement,
  statements: Array<ts.Statement>,
  literalInitializer: ts.ObjectLiteralExpression = ts.createObjectLiteral(),
  addExportModifier = false,
): ts.Statement[] {
  const node = addExportModifier
    ? ts.updateVariableStatement(
      hostNode,
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      hostNode.declarationList,
    )
    : hostNode;

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

  return [updateHostNode(node, addPureComment(ts.createParen(iife)))];
}

function createWrappedClass(
  hostNode: ts.ClassDeclaration | ts.VariableDeclaration,
  statements: ts.Statement[],
): ts.Statement[] {
  const name = (hostNode.name as ts.Identifier).text;

  const updatedStatements = [...statements];

  if (ts.isClassDeclaration(hostNode)) {
    updatedStatements[0] = ts.createClassDeclaration(
      hostNode.decorators,
      undefined,
      hostNode.name,
      hostNode.typeParameters,
      hostNode.heritageClauses,
      hostNode.members,
    );
  }

  const pureIife = addPureComment(
    ts.createImmediatelyInvokedArrowFunction([
      ...updatedStatements,
      ts.createReturn(ts.createIdentifier(name)),
    ]),
  );

  const modifiers = hostNode.modifiers;
  const isDefault = !!modifiers
    && modifiers.some(x => x.kind === ts.SyntaxKind.DefaultKeyword);

  const newStatement: ts.Statement[] = [];
  newStatement.push(
    ts.createVariableStatement(
      isDefault ? undefined : modifiers,
      ts.createVariableDeclarationList([
        ts.createVariableDeclaration(name, undefined, pureIife),
      ],
        ts.NodeFlags.Const,
      ),
    ));

  if (isDefault) {
    newStatement.push(
      ts.createExportAssignment(
        undefined,
        undefined,
        false,
        ts.createIdentifier(name),
      ));
  }

  return newStatement;
}
