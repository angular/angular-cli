/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { collectDeepNodes } from '../helpers/ast-utils';

/**
 * @deprecated From 0.9.0
 */
export function testScrubFile(content: string) {
  const markers = [
    'decorators',
    '__decorate',
    'propDecorators',
    'ctorParameters',
  ];

  return markers.some((marker) => content.indexOf(marker) !== -1);
}

export function getScrubFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return scrubFileTransformer(program.getTypeChecker(), false);
}

export function getScrubFileTransformerForCore(
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  return scrubFileTransformer(program.getTypeChecker(), true);
}

function scrubFileTransformer(checker: ts.TypeChecker, isAngularCoreFile: boolean) {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const ngMetadata = findAngularMetadata(sf, isAngularCoreFile);
      const tslibImports = findTslibImports(sf);

      const nodes: ts.Node[] = [];
      ts.forEachChild(sf, checkNodeForDecorators);

      function checkNodeForDecorators(node: ts.Node): void {
        if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
          // TS 2.4 nests decorators inside downleveled class IIFEs, so we
          // must recurse into them to find the relevant expression statements.
          return ts.forEachChild(node, checkNodeForDecorators);
        }
        const exprStmt = node as ts.ExpressionStatement;
        if (isDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isDecorateAssignmentExpression(exprStmt, tslibImports, checker)) {
          nodes.push(...pickDecorateNodesToRemove(exprStmt, tslibImports, ngMetadata, checker));
        }
        if (isAngularDecoratorMetadataExpression(exprStmt, ngMetadata, tslibImports, checker)) {
          nodes.push(node);
        }
        if (isPropDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickPropDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isCtorParamsAssignmentExpression(exprStmt)) {
          nodes.push(node);
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
        specs.push(...collectDeepNodes<ts.ImportSpecifier>(importDecl, ts.SyntaxKind.ImportSpecifier));
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
  if (isAngularCoreFile && (importText.startsWith('./') || importText.startsWith('../'))) {
    return true;
  }

  return false;
}

// Check if assignment is `Clazz.decorators = [...];`.
function isDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.left as ts.PropertyAccessExpression;
  if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  if (propAccess.name.text !== 'decorators') {
    return false;
  }
  if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
    return false;
  }
  if (expr.right.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return false;
  }

  return true;
}

// Check if assignment is `Clazz = __decorate([...], Clazz)`.
function isDecorateAssignmentExpression(
  exprStmt: ts.ExpressionStatement,
  tslibImports: ts.NamespaceImport[],
  checker: ts.TypeChecker,
): boolean {

  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const classIdent = expr.left as ts.Identifier;
  let callExpr: ts.CallExpression;

  if (expr.right.kind === ts.SyntaxKind.CallExpression) {
    callExpr = expr.right as ts.CallExpression;
  } else if (expr.right.kind === ts.SyntaxKind.BinaryExpression) {
    // `Clazz = Clazz_1 = __decorate([...], Clazz)` can be found when there are static property
    // accesses.
    const innerExpr = expr.right as ts.BinaryExpression;
    if (innerExpr.left.kind !== ts.SyntaxKind.Identifier
      || innerExpr.right.kind !== ts.SyntaxKind.CallExpression) {
      return false;
    }
    callExpr = innerExpr.right as ts.CallExpression;
  } else {
    return false;
  }

  if (!isTslibHelper(callExpr, '__decorate', tslibImports, checker)) {
    return false;
  }

  if (callExpr.arguments.length !== 2) {
    return false;
  }
  if (callExpr.arguments[1].kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const classArg = callExpr.arguments[1] as ts.Identifier;
  if (classIdent.text !== classArg.text) {
    return false;
  }
  if (callExpr.arguments[0].kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return false;
  }

  return true;
}

// Check if expression is `__decorate([smt, __metadata("design:type", Object)], ...)`.
function isAngularDecoratorMetadataExpression(
  exprStmt: ts.ExpressionStatement,
  ngMetadata: ts.Node[],
  tslibImports: ts.NamespaceImport[],
  checker: ts.TypeChecker,
): boolean {

  if (exprStmt.expression.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpr = exprStmt.expression as ts.CallExpression;
  if (!isTslibHelper(callExpr, '__decorate', tslibImports, checker)) {
    return false;
  }
  if (callExpr.arguments.length !== 4) {
    return false;
  }
  if (callExpr.arguments[0].kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return false;
  }
  const decorateArray = callExpr.arguments[0] as ts.ArrayLiteralExpression;
  // Check first array entry for Angular decorators.
  if (decorateArray.elements[0].kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const decoratorCall = decorateArray.elements[0] as ts.CallExpression;
  if (decoratorCall.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const decoratorId = decoratorCall.expression as ts.Identifier;
  if (!identifierIsMetadata(decoratorId, ngMetadata, checker)) {
    return false;
  }
  // Check second array entry for __metadata call.
  if (decorateArray.elements[1].kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const metadataCall = decorateArray.elements[1] as ts.CallExpression;
  if (!isTslibHelper(metadataCall, '__metadata', tslibImports, checker)) {
    return false;
  }

  return true;
}

// Check if assignment is `Clazz.propDecorators = [...];`.
function isPropDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.left as ts.PropertyAccessExpression;
  if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  if (propAccess.name.text !== 'propDecorators') {
    return false;
  }
  if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
    return false;
  }
  if (expr.right.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
    return false;
  }

  return true;
}

// Check if assignment is `Clazz.ctorParameters = [...];`.
function isCtorParamsAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.left as ts.PropertyAccessExpression;
  if (propAccess.name.text !== 'ctorParameters') {
    return false;
  }
  if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
    return false;
  }
  if (expr.right.kind !== ts.SyntaxKind.FunctionExpression
    && expr.right.kind !== ts.SyntaxKind.ArrowFunction
  ) {
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
  const literal = expect<ts.ArrayLiteralExpression>(expr.right,
    ts.SyntaxKind.ArrayLiteralExpression);
  if (!literal.elements.every((elem) => elem.kind === ts.SyntaxKind.ObjectLiteralExpression)) {
    return [];
  }
  const elements = literal.elements as ts.NodeArray<ts.ObjectLiteralExpression>;
  const ngDecorators = elements.filter((elem) => isAngularDecorator(elem, ngMetadata, checker));

  return (elements.length > ngDecorators.length) ? ngDecorators : [exprStmt];
}

// Remove Angular decorators from `Clazz = __decorate([...], Clazz)`, or expression itself if all
// are removed.
function pickDecorateNodesToRemove(
  exprStmt: ts.ExpressionStatement,
  tslibImports: ts.NamespaceImport[],
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): ts.Node[] {

  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  let callExpr: ts.CallExpression;

  if (expr.right.kind === ts.SyntaxKind.CallExpression) {
    callExpr = expect<ts.CallExpression>(expr.right, ts.SyntaxKind.CallExpression);
  } else if (expr.right.kind === ts.SyntaxKind.BinaryExpression) {
    const innerExpr = expr.right as ts.BinaryExpression;
    callExpr = expect<ts.CallExpression>(innerExpr.right, ts.SyntaxKind.CallExpression);
  } else {
    return [];
  }

  const arrLiteral = expect<ts.ArrayLiteralExpression>(callExpr.arguments[0],
    ts.SyntaxKind.ArrayLiteralExpression);

  if (!arrLiteral.elements.every((elem) => elem.kind === ts.SyntaxKind.CallExpression)) {
    return [];
  }
  const elements = arrLiteral.elements as ts.NodeArray<ts.CallExpression>;
  const ngDecoratorCalls = elements.filter((el) => {
    if (el.expression.kind !== ts.SyntaxKind.Identifier) {
      return false;
    }
    const id = el.expression as ts.Identifier;

    return identifierIsMetadata(id, ngMetadata, checker);
  });


  // Remove __metadata calls of type 'design:paramtypes'.
  const metadataCalls = elements.filter((el) => {
    if (!isTslibHelper(el, '__metadata', tslibImports, checker)) {
      return false;
    }
    if (el.arguments.length < 2) {
      return false;
    }
    if (el.arguments[0].kind !== ts.SyntaxKind.StringLiteral) {
      return false;
    }
    const metadataTypeId = el.arguments[0] as ts.StringLiteral;
    if (metadataTypeId.text !== 'design:paramtypes') {
      return false;
    }

    return true;
  });
  // Remove all __param calls.
  const paramCalls = elements.filter((el) => {
    if (!isTslibHelper(el, '__param', tslibImports, checker)) {
      return false;
    }
    if (el.arguments.length != 2) {
      return false;
    }
    if (el.arguments[0].kind !== ts.SyntaxKind.NumericLiteral) {
      return false;
    }

    return true;
  });
  ngDecoratorCalls.push(...metadataCalls, ...paramCalls);

  // If all decorators are metadata decorators then return the whole `Class = __decorate([...])'`
  // statement so that it is removed in entirety
  return (elements.length === ngDecoratorCalls.length) ? [exprStmt] : ngDecoratorCalls;
}

// Remove Angular decorators from`Clazz.propDecorators = [...];`, or expression itself if all
// are removed.
function pickPropDecorationNodesToRemove(
  exprStmt: ts.ExpressionStatement,
  ngMetadata: ts.Node[],
  checker: ts.TypeChecker,
): ts.Node[] {

  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ObjectLiteralExpression>(expr.right,
    ts.SyntaxKind.ObjectLiteralExpression);
  if (!literal.properties.every((elem) => elem.kind === ts.SyntaxKind.PropertyAssignment &&
    (elem as ts.PropertyAssignment).initializer.kind === ts.SyntaxKind.ArrayLiteralExpression)) {
    return [];
  }
  const assignments = literal.properties as ts.NodeArray<ts.PropertyAssignment>;
  // Consider each assignment individually. Either the whole assignment will be removed or
  // a particular decorator within will.
  const toRemove = assignments
    .map((assign) => {
      const decorators =
        expect<ts.ArrayLiteralExpression>(assign.initializer,
          ts.SyntaxKind.ArrayLiteralExpression).elements;
      if (!decorators.every((el) => el.kind === ts.SyntaxKind.ObjectLiteralExpression)) {
        return [];
      }
      const decsToRemove = decorators.filter((expression) => {
        const lit = expect<ts.ObjectLiteralExpression>(expression,
          ts.SyntaxKind.ObjectLiteralExpression);

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
  if (toRemove.length === assignments.length &&
    toRemove.every((node) => node.kind === ts.SyntaxKind.PropertyAssignment)) {
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
  if (assign.initializer.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const id = assign.initializer as ts.Identifier;
  const res = identifierIsMetadata(id, ngMetadata, checker);

  return res;
}

function isTypeProperty(prop: ts.ObjectLiteralElement): boolean {
  if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
    return false;
  }
  const assignment = prop as ts.PropertyAssignment;
  if (assignment.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const name = assignment.name as ts.Identifier;

  return name.text === 'type';
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

  return symbol
    .declarations
    .some((spec) => metadata.indexOf(spec) !== -1);
}

// Check if an import is a tslib helper import (`import * as tslib from "tslib";`)
function isTslibImport(node: ts.ImportDeclaration): boolean {
  return !!(node.moduleSpecifier &&
    node.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral &&
    (node.moduleSpecifier as ts.StringLiteral).text === 'tslib' &&
    node.importClause &&
    node.importClause.namedBindings &&
    node.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport);
}

// Find all namespace imports for `tslib`.
function findTslibImports(node: ts.Node): ts.NamespaceImport[] {
  const imports: ts.NamespaceImport[] = [];
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDecl = child as ts.ImportDeclaration;
      if (isTslibImport(importDecl)) {
        const importClause = importDecl.importClause as ts.ImportClause;
        const namespaceImport = importClause.namedBindings as ts.NamespaceImport;
        imports.push(namespaceImport);
      }
    }
  });

  return imports;
}

// Check if an identifier is part of the known tslib identifiers.
function identifierIsTslib(
  id: ts.Identifier,
  tslibImports: ts.NamespaceImport[],
  checker: ts.TypeChecker,
): boolean {
  const symbol = checker.getSymbolAtLocation(id);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return false;
  }

  return symbol
    .declarations
    .some((spec) => tslibImports.indexOf(spec as ts.NamespaceImport) !== -1);
}

// Check if a function call is a tslib helper.
function isTslibHelper(
  callExpr: ts.CallExpression,
  helper: string,
  tslibImports: ts.NamespaceImport[],
  checker: ts.TypeChecker,
) {

  let callExprIdent = callExpr.expression as ts.Identifier;

  if (callExpr.expression.kind !== ts.SyntaxKind.Identifier) {
    if (callExpr.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
      const propAccess = callExpr.expression as ts.PropertyAccessExpression;
      const left = propAccess.expression;
      callExprIdent = propAccess.name;

      if (left.kind !== ts.SyntaxKind.Identifier) {
        return false;
      }

      const id = left as ts.Identifier;

      if (!identifierIsTslib(id, tslibImports, checker)) {
        return false;
      }

    } else {
      return false;
    }
  }

  // node.text on a name that starts with two underscores will return three instead.
  // Unless it's an expression like tslib.__decorate, in which case it's only 2.
  if (callExprIdent.text !== `_${helper}` && callExprIdent.text !== helper) {
    return false;
  }

  return true;
}
