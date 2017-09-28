/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { findNode, getSourceNodes } from '../utility/ast-utils';

export function findBootstrapModuleCall(host: Tree, mainPath: string): ts.CallExpression | null {
  const mainBuffer = host.read(mainPath);
  if (!mainBuffer) {
    throw new SchematicsException(`Main file (${mainPath}) not found`);
  }
  const mainText = mainBuffer.toString('utf-8');
  const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);

  const allNodes = getSourceNodes(source);

  let bootstrapCall: ts.CallExpression | null = null;

  for (const node of allNodes) {

    let bootstrapCallNode: ts.Node | null = null;
    bootstrapCallNode = findNode(node, ts.SyntaxKind.Identifier, 'bootstrapModule');

    // Walk up the parent until CallExpression is found.
    while (bootstrapCallNode && bootstrapCallNode.parent
      && bootstrapCallNode.parent.kind !== ts.SyntaxKind.CallExpression) {

      bootstrapCallNode = bootstrapCallNode.parent;
    }

    if (bootstrapCallNode !== null &&
      bootstrapCallNode.parent !== undefined &&
      bootstrapCallNode.parent.kind === ts.SyntaxKind.CallExpression) {
      bootstrapCall = bootstrapCallNode.parent as ts.CallExpression;
      break;
    }
  }

  return bootstrapCall;
}
