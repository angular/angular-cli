/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


// Find all nodes from the AST in the subtree of node of SyntaxKind kind.
export function collectDeepNodes<T extends ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind | ts.SyntaxKind[],
): T[] {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const nodes: T[] = [];
  const helper = (child: ts.Node) => {
    if (kinds.includes(child.kind)) {
      nodes.push(child as T);
    }
    ts.forEachChild(child, helper);
  };
  ts.forEachChild(node, helper);

  return nodes;
}

export function getFirstNode(sourceFile: ts.SourceFile): ts.Node {
  if (sourceFile.statements.length > 0) {
    return sourceFile.statements[0];
  }

  return sourceFile.getChildAt(0);
}

export function getLastNode(sourceFile: ts.SourceFile): ts.Node | null {
  if (sourceFile.statements.length > 0) {
    return sourceFile.statements[sourceFile.statements.length - 1] || null;
  }

  return null;
}
