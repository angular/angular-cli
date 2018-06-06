/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

// Find all nodes from the AST in the subtree of node of SyntaxKind kind.
export function collectDeepNodes<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T[] {
  const nodes: T[] = [];
  const helper = (child: ts.Node) => {
    if (child.kind === kind) {
      nodes.push(child as T);
    }
    ts.forEachChild(child, helper);
  };
  ts.forEachChild(node, helper);

  return nodes;
}

export function drilldownNodes<T extends ts.Node>(
  startingNode: ts.Node,
  path: { prop: string | null, kind: ts.SyntaxKind }[],
): T | null {
  let currentNode: T | ts.Node | undefined = startingNode;
  for (const segment of path) {
    if (segment.prop) {
      // ts.Node has no index signature, so we need to cast it as any.
      // tslint:disable-next-line:no-any
      currentNode = (currentNode as any)[segment.prop];
    }
    if (!currentNode || currentNode.kind !== segment.kind) {
      return null;
    }
  }

  return currentNode as T;
}
