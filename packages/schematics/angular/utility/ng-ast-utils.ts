/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { dirname } from 'path';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNode, getSourceNodes } from '../utility/ast-utils';

export function findBootstrapModuleCall(host: Tree, mainPath: string): ts.CallExpression | null {
  const mainText = host.readText(mainPath);
  const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);

  const allNodes = getSourceNodes(source);

  let bootstrapCall: ts.CallExpression | null = null;

  for (const node of allNodes) {
    let bootstrapCallNode: ts.Node | null = null;
    bootstrapCallNode = findNode(node, ts.SyntaxKind.Identifier, 'bootstrapModule');

    // Walk up the parent until CallExpression is found.
    while (
      bootstrapCallNode &&
      bootstrapCallNode.parent &&
      bootstrapCallNode.parent.kind !== ts.SyntaxKind.CallExpression
    ) {
      bootstrapCallNode = bootstrapCallNode.parent;
    }

    if (
      bootstrapCallNode !== null &&
      bootstrapCallNode.parent !== undefined &&
      bootstrapCallNode.parent.kind === ts.SyntaxKind.CallExpression
    ) {
      bootstrapCall = bootstrapCallNode.parent as ts.CallExpression;
      break;
    }
  }

  return bootstrapCall;
}

export function findBootstrapModulePath(host: Tree, mainPath: string): string {
  const bootstrapCall = findBootstrapModuleCall(host, mainPath);
  if (!bootstrapCall) {
    throw new SchematicsException('Bootstrap call not found');
  }

  const bootstrapModule = bootstrapCall.arguments[0];

  const mainText = host.readText(mainPath);
  const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);
  const allNodes = getSourceNodes(source);
  const bootstrapModuleRelativePath = allNodes
    .filter(ts.isImportDeclaration)
    .filter((imp) => {
      return findNode(imp, ts.SyntaxKind.Identifier, bootstrapModule.getText());
    })
    .map((imp) => {
      const modulePathStringLiteral = imp.moduleSpecifier as ts.StringLiteral;

      return modulePathStringLiteral.text;
    })[0];

  return bootstrapModuleRelativePath;
}

export function getAppModulePath(host: Tree, mainPath: string): string {
  const moduleRelativePath = findBootstrapModulePath(host, mainPath);
  const mainDir = dirname(mainPath);
  const modulePath = normalize(`/${mainDir}/${moduleRelativePath}.ts`);

  return modulePath;
}
