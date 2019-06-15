/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { elideImports } from './elide_imports';
import {
  AddNodeOperation,
  OPERATION_KIND,
  RemoveNodeOperation,
  ReplaceNodeOperation,
  StandardTransform,
  TransformOperation,
} from './interfaces';

export function makeTransform(
  standardTransform: StandardTransform,
  getTypeChecker?: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
      const ops: TransformOperation[] = standardTransform(sf);
      const removeOps = ops.filter(
        op => op.kind === OPERATION_KIND.Remove,
      ) as RemoveNodeOperation[];
      const addOps = ops.filter(op => op.kind === OPERATION_KIND.Add) as AddNodeOperation[];
      const replaceOps = ops.filter(
        op => op.kind === OPERATION_KIND.Replace,
      ) as ReplaceNodeOperation[];

      // If nodes are removed, elide the imports as well.
      // Mainly a workaround for https://github.com/Microsoft/TypeScript/issues/17552.
      // WARNING: this assumes that replaceOps DO NOT reuse any of the nodes they are replacing.
      // This is currently true for transforms that use replaceOps (replace_bootstrap and
      // replace_resources), but may not be true for new transforms.
      if (getTypeChecker && removeOps.length + replaceOps.length > 0) {
        const removedNodes = removeOps.concat(replaceOps).map(op => op.target);
        removeOps.push(...elideImports(sf, removedNodes, getTypeChecker));
      }

      const visitor: ts.Visitor = node => {
        let modified = false;
        let modifiedNodes = [node];
        // Check if node should be dropped.
        if (removeOps.find(op => op.target === node)) {
          modifiedNodes = [];
          modified = true;
        }

        // Check if node should be replaced (only replaces with first op found).
        const replace = replaceOps.find(op => op.target === node);
        if (replace) {
          modifiedNodes = [replace.replacement];
          modified = true;
        }

        // Check if node should be added to.
        const add = addOps.filter(op => op.target === node);
        if (add.length > 0) {
          modifiedNodes = [
            ...add.filter(op => op.before).map(op => op.before),
            ...modifiedNodes,
            ...add.filter(op => op.after).map(op => op.after),
          ] as ts.Node[];
          modified = true;
        }

        // If we changed anything, return modified nodes without visiting further.
        if (modified) {
          return modifiedNodes;
        } else {
          // Otherwise return node as is and visit children.
          return ts.visitEachChild(node, visitor, context);
        }
      };

      // Don't visit the sourcefile at all if we don't have ops for it.
      if (ops.length === 0) {
        return sf;
      }

      const result = ts.visitNode(sf, visitor);

      // If we removed any decorators, we need to clean up the decorator arrays.
      if (removeOps.some(op => op.target.kind === ts.SyntaxKind.Decorator)) {
        cleanupDecorators(result);
      }

      return result;
    };

    return transformer;
  };
}

// If TS sees an empty decorator array, it will still emit a `__decorate` call.
//    This seems to be a TS bug.
function cleanupDecorators(node: ts.Node) {
  if (node.decorators && node.decorators.length === 0) {
    node.decorators = undefined;
  }

  ts.forEachChild(node, node => cleanupDecorators(node));
}
