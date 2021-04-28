/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { collectDeepNodes } from '../helpers/ast-utils';

export function testScrubFile(content: string) {
  const markers = [
    'decorators',
    '__decorate',
    'propDecorators',
    'ctorParameters',
    'ɵsetClassMetadata',
  ];

  return markers.some((marker) => content.includes(marker));
}

export function createScrubFileTransformerFactory(
  isAngularCoreFile: boolean,
): (program?: ts.Program) => ts.TransformerFactory<ts.SourceFile> {
  return (program) => scrubFileTransformer(program, isAngularCoreFile);
}

function scrubFileTransformer(program: ts.Program | undefined, isAngularCoreFile: boolean) {
  if (!program) {
    throw new Error('scrubFileTransformer requires a TypeScript Program.');
  }
  const checker = program.getTypeChecker();

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
      const ngMetadata = findAngularMetadata(sf, isAngularCoreFile);
      const tslibImports = findTslibImports(sf);

      const nodes: ts.Node[] = [];
      ts.forEachChild(sf, checkNodeForDecorators);

      function checkNodeForDecorators(node: ts.Node): void {
        if (!ts.isExpressionStatement(node)) {
          return ts.forEachChild(node, checkNodeForDecorators);
        }

        const exprStmt = node as ts.ExpressionStatement;
        const iife = getIifeStatement(exprStmt)?.expression;
        // Do checks that don't need the typechecker first and bail early.
        if (isCtorParamsAssignmentExpression(exprStmt)) {
          nodes.push(node);
        } else if (iife && isIvyPrivateCallExpression(iife, 'ɵsetClassMetadata')) {
          nodes.push(node);
        } else if (
          iife &&
          ts.isBinaryExpression(iife) &&
          isIvyPrivateCallExpression(iife.right, 'ɵsetClassMetadata')
        ) {
          nodes.push(node);
        } else if (isDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        } else if (
          isDecorateAssignmentExpression(exprStmt, tslibImports, checker) ||
          isAngularDecoratorExpression(exprStmt, ngMetadata, tslibImports, checker)
        ) {
          nodes.push(...pickDecorateNodesToRemove(exprStmt, tslibImports, ngMetadata, checker));
        } else if (isPropDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickPropDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
      }

      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        // Check if node is a statement to be dropped.
        if (nodes.find((n) => n === node)) {
          return undefined;
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };

    return transformer;
  };
}

export function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T {
  if (node.kind !== kind) {
    throw new Error('Invalid node type.');
  }

  return node as T;
}

function findAngularMetadata(node: ts.Node, isAngularCoreFile: boolean): ts.Node[] {
  let specs: ts.Node[] = [];
  // Find all specifiers from imports of `@angular/core`.
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDecl = child as ts.ImportDeclaration;
      if (isAngularCoreImport(importDecl, isAngularCoreFile)) {
        specs.push(
          ...collectDeepNodes<ts.ImportSpecifier>(importDecl, ts.SyntaxKind.ImportSpecifier),
        );
      }
    }
  });

  // If the current module is a Angular core file, we also consider all declarations in it to
  // potentially be Angular metadata.
  if (isAngularCoreFile) {
    const localDecl = findAllDeclarations(node);
    specs = specs.concat(localDecl);
  }

  return specs;
}

function findAllDeclarations(node: ts.Node): ts.VariableDeclaration[] {
  const nodes: ts.VariableDeclaration[] = [];
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.VariableStatement) {
      const vStmt = child as ts.VariableStatement;
      vStmt.declarationList.declarations.forEach((decl) => {
        if (decl.name.kind !== ts.SyntaxKind.Identifier) {
          return;
        }
        nodes.push(decl);
      });
    }
  });

  return nodes;
}

function isAngularCoreImport(node: ts.ImportDeclaration, isAngularCoreFile: boolean): boolean {
  if (!(node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))) {
    return false;
  }
  const importText = node.moduleSpecifier.text;

  // Imports to `@angular/core` are always core imports.
  if (importText === '@angular/core') {
    return true;
  }

  // Relative imports from a Angular core file are also core imports.
  if (isAngularCoreFile && importText.startsWith('.')) {
    return true;
  }

  return false;
}

// Check if assignment is `Clazz.decorators = [...];`.
function isDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (!isAssignmentExpressionTo(exprStmt, 'decorators')) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (!ts.isArrayLiteralExpression(expr.right)) {
    return false;
  }

  return true;
}

// Check if assignment is `Clazz = __decorate([...], Clazz)`.
function isDecorateAssignmentExpression(
  exprStmt: ts.ExpressionStatement,
  tslibImports: ts.NamedImports[],
  checker: ts.TypeChecker,
): boolean {
  if (!ts.isBinaryExpression(exprStmt.expression)) {
    return false;
  }
  const expr = exprStmt.expression;
  if (!ts.isIdentifier(expr.left)) {
    return false;
  }
  const classIdent = expr.left;
  let callExpr: ts.CallExpression;

  if (ts.isCallExpression(expr.right)) {
    callExpr = expr.right;
  } else if (ts.isBinaryExpression(expr.right)) {
    // `Clazz = Clazz_1 = __decorate([...], Clazz)` can be found when there are static property
    // accesses.
    const innerExpr = expr.right;
    if (!ts.isIdentifier(innerExpr.left) || !ts.isCallExpression(innerExpr.right)) {
      return false;
    }
    callExpr = innerExpr.right;
  } else {
    return false;
  }

  if (!isTslibHelper(callExpr, '__decorate', tslibImports, checker)) {
    return false;
  }

  if (callExpr.arguments.length !== 2) {
    return false;
  }

  const classArg = callExpr.arguments[1];
  if (!ts.isIdentifier(classArg)) {
    return false;
  }

  if (classIdent.text !== classArg.text) {
    return false;
  }
  if (!ts.isArrayLiteralExpression(callExpr.arguments[0])) {
    return false;
  }

  return true;
}

// Check if expression is `__decorate([smt, __metadata("design:type", Object)], ...)`.
function isAngularDecoratorExpression(
  exprStmt: ts.ExpressionStatement,
  ngMetadata: ts.Node[],
  tslibImports: ts.NamedImports[],
  checker: ts.TypeChecker,
): boolean {
  if (!ts.isCallExpression(exprStmt.expression)) {
    return false;
  }
  const callExpr = exprStmt.expression;
  if (!isTslibHelper(callExpr, '__decorate', tslibImports, checker)) {
    return false;
  }
  if (callExpr.arguments.length !== 4) {
    return false;
  }
  const decorateArray = callExpr.arguments[0];
  if (!ts.isArrayLiteralExpression(decorateArray)) {
    return false;
  }
  // Check first array entry for Angular decorators.
  if (decorateArray.elements.length === 0 || !ts.isCallExpression(decorateArray.elements[0])) {
    return false;
  }

  return decorateArray.elements.some((decoratorCall) => {
    if (!ts.isCallExpression(decoratorCall) || !ts.isIdentifier(decoratorCall.expression)) {
      return false;
    }

    const decoratorId = decoratorCall.expression;

    return identifierIsMetadata(decoratorId, ngMetadata, checker);
  });
}

// Check if assignment is `Clazz.propDecorators = [...];`.
function isPropDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (!isAssignmentExpressionTo(exprStmt, 'propDecorators')) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.right.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
    return false;
  }

  return true;
}

// Check if assignment is `Clazz.ctorParameters = [...];`.
function isCtorParamsAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (!isAssignmentExpressionTo(exprStmt, 'ctorParameters')) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (
    expr.right.kind !== ts.SyntaxKind.FunctionExpression &&
    expr.right.kind !== ts.SyntaxKind.ArrowFunction
  ) {
    return false;
  }

  return true;
}

function isAssignmentExpressionTo(exprStmt: ts.ExpressionStatement, name: string) {
  if (!ts.isBinaryExpression(exprStmt.expression)) {
    return false;
  }
  const expr = exprStmt.expression;
  if (!ts.isPropertyAccessExpression(expr.left)) {
    return false;
  }
  const propAccess = expr.left;
  if (propAccess.name.text !== name) {
    return false;
  }
  if (!ts.isIdentifier(propAccess.expression)) {
    return false;
  }
  if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
    return false;
  }

  return true;
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

// Remove Angular decorators from`Clazz.decorators = [...];`, or expression itself if all are
// removed.
function pickDecorationNodesToRemove(
  exprStmt: ts.ExpressionStatement,
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): ts.Node[] {
  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ArrayLiteralExpression>(
    expr.right,
    ts.SyntaxKind.ArrayLiteralExpression,
  );
  if (!literal.elements.every((elem) => ts.isObjectLiteralExpression(elem))) {
    return [];
  }
  const elements = literal.elements as ts.NodeArray<ts.ObjectLiteralExpression>;
  const ngDecorators = elements.filter((elem) => isAngularDecorator(elem, ngMetadata, checker));

  return elements.length > ngDecorators.length ? ngDecorators : [exprStmt];
}

// Remove Angular decorators from `Clazz = __decorate([...], Clazz)`, or expression itself if all
// are removed.
function pickDecorateNodesToRemove(
  exprStmt: ts.ExpressionStatement,
  tslibImports: ts.NamedImports[],
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): ts.Node[] {
  let callExpr: ts.CallExpression | undefined;
  if (ts.isCallExpression(exprStmt.expression)) {
    callExpr = exprStmt.expression;
  } else if (ts.isBinaryExpression(exprStmt.expression)) {
    const expr = exprStmt.expression;
    if (ts.isCallExpression(expr.right)) {
      callExpr = expr.right;
    } else if (ts.isBinaryExpression(expr.right) && ts.isCallExpression(expr.right.right)) {
      callExpr = expr.right.right;
    }
  }

  if (!callExpr) {
    return [];
  }

  const arrLiteral = expect<ts.ArrayLiteralExpression>(
    callExpr.arguments[0],
    ts.SyntaxKind.ArrayLiteralExpression,
  );

  if (!arrLiteral.elements.every((elem) => ts.isCallExpression(elem))) {
    return [];
  }
  const elements = arrLiteral.elements as ts.NodeArray<ts.CallExpression>;
  const ngDecoratorCalls = elements.filter((el) => {
    if (!ts.isIdentifier(el.expression)) {
      return false;
    }

    return identifierIsMetadata(el.expression, ngMetadata, checker);
  });

  // Remove __metadata calls of type 'design:paramtypes'.
  const metadataCalls = elements.filter((el) => {
    if (!isTslibHelper(el, '__metadata', tslibImports, checker)) {
      return false;
    }

    if (el.arguments.length < 2 || !ts.isStringLiteral(el.arguments[0])) {
      return false;
    }

    return true;
  });
  // Remove all __param calls.
  const paramCalls = elements.filter((el) => {
    if (!isTslibHelper(el, '__param', tslibImports, checker)) {
      return false;
    }

    if (el.arguments.length !== 2 || !ts.isNumericLiteral(el.arguments[0])) {
      return false;
    }

    return true;
  });

  if (ngDecoratorCalls.length === 0) {
    return [];
  }

  const callCount = ngDecoratorCalls.length + metadataCalls.length + paramCalls.length;

  // If all decorators are metadata decorators then return the whole `Class = __decorate([...])'`
  // statement so that it is removed in entirety.
  // If not then only remove the Angular decorators.
  // The metadata and param calls may be used by the non-Angular decorators.
  return elements.length === callCount ? [exprStmt] : ngDecoratorCalls;
}

// Remove Angular decorators from`Clazz.propDecorators = [...];`, or expression itself if all
// are removed.
function pickPropDecorationNodesToRemove(
  exprStmt: ts.ExpressionStatement,
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): ts.Node[] {
  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ObjectLiteralExpression>(
    expr.right,
    ts.SyntaxKind.ObjectLiteralExpression,
  );
  if (
    !literal.properties.every(
      (elem) => ts.isPropertyAssignment(elem) && ts.isArrayLiteralExpression(elem.initializer),
    )
  ) {
    return [];
  }
  const assignments = literal.properties as ts.NodeArray<ts.PropertyAssignment>;
  // Consider each assignment individually. Either the whole assignment will be removed or
  // a particular decorator within will.
  const toRemove = assignments
    .map((assign) => {
      const decorators = expect<ts.ArrayLiteralExpression>(
        assign.initializer,
        ts.SyntaxKind.ArrayLiteralExpression,
      ).elements;
      if (!decorators.every((el) => ts.isObjectLiteralExpression(el))) {
        return [];
      }
      const decsToRemove = decorators.filter((expression) => {
        const lit = expect<ts.ObjectLiteralExpression>(
          expression,
          ts.SyntaxKind.ObjectLiteralExpression,
        );

        return isAngularDecorator(lit, ngMetadata, checker);
      });
      if (decsToRemove.length === decorators.length) {
        return [assign];
      }

      return decsToRemove;
    })
    .reduce((accum, toRm) => accum.concat(toRm), [] as ts.Node[]);
  // If every node to be removed is a property assignment (full property's decorators) and
  // all properties are accounted for, remove the whole assignment. Otherwise, remove the
  // nodes which were marked as safe.
  if (
    toRemove.length === assignments.length &&
    toRemove.every((node) => ts.isPropertyAssignment(node))
  ) {
    return [exprStmt];
  }

  return toRemove;
}

function isAngularDecorator(
  literal: ts.ObjectLiteralExpression,
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): boolean {
  const types = literal.properties.filter(isTypeProperty);
  if (types.length !== 1) {
    return false;
  }
  const assign = expect<ts.PropertyAssignment>(types[0], ts.SyntaxKind.PropertyAssignment);
  if (!ts.isIdentifier(assign.initializer)) {
    return false;
  }
  const id = assign.initializer;
  const res = identifierIsMetadata(id, ngMetadata, checker);

  return res;
}

function isTypeProperty(prop: ts.ObjectLiteralElement): boolean {
  if (!ts.isPropertyAssignment(prop)) {
    return false;
  }

  if (!ts.isIdentifier(prop.name)) {
    return false;
  }

  return prop.name.text === 'type';
}

// Check if an identifier is part of the known Angular Metadata.
function identifierIsMetadata(
  id: ts.Identifier,
  metadata: ts.Node[],
  checker: ts.TypeChecker,
): boolean {
  const symbol = checker.getSymbolAtLocation(id);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return false;
  }

  return symbol.declarations.some((spec) => metadata.includes(spec));
}

// Find all named imports for `tslib`.
function findTslibImports(node: ts.Node): ts.NamedImports[] {
  const imports: ts.NamedImports[] = [];

  ts.forEachChild(node, (child) => {
    if (
      ts.isImportDeclaration(child) &&
      child.moduleSpecifier &&
      ts.isStringLiteral(child.moduleSpecifier) &&
      child.moduleSpecifier.text === 'tslib' &&
      child.importClause?.namedBindings &&
      ts.isNamedImports(child.importClause?.namedBindings)
    ) {
      imports.push(child.importClause.namedBindings);
    }
  });

  return imports;
}

// Check if a function call is a tslib helper.
function isTslibHelper(
  callExpr: ts.CallExpression,
  helper: string,
  tslibImports: ts.NamedImports[],
  checker: ts.TypeChecker,
) {
  if (!ts.isIdentifier(callExpr.expression) || callExpr.expression.text !== helper) {
    return false;
  }

  const symbol = checker.getSymbolAtLocation(callExpr.expression);
  if (!symbol?.declarations?.length) {
    return false;
  }

  for (const dec of symbol.declarations) {
    if (ts.isImportSpecifier(dec) && tslibImports.some((name) => name.elements.includes(dec))) {
      return true;
    }

    // Handle inline helpers `var __decorate = (this...`
    if (ts.isVariableDeclaration(dec)) {
      return true;
    }
  }

  return false;
}
