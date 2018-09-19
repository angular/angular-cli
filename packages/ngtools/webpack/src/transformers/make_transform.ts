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


// Typescript below 2.7.0 needs a workaround.
const tsVersionParts = ts.version.split('.').map(p => Number(p));
const visitEachChild = tsVersionParts[0] <= 2 && tsVersionParts[1] < 7
  ? visitEachChildWorkaround
  : ts.visitEachChild;

export function makeTransform(
  standardTransform: StandardTransform,
  getTypeChecker?: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
      const ops: TransformOperation[] = standardTransform(sf);
      const removeOps = ops
        .filter((op) => op.kind === OPERATION_KIND.Remove) as RemoveNodeOperation[];
      const addOps = ops.filter((op) => op.kind === OPERATION_KIND.Add) as AddNodeOperation[];
      const replaceOps = ops
        .filter((op) => op.kind === OPERATION_KIND.Replace) as ReplaceNodeOperation[];

      // If nodes are removed, elide the imports as well.
      // Mainly a workaround for https://github.com/Microsoft/TypeScript/issues/17552.
      // WARNING: this assumes that replaceOps DO NOT reuse any of the nodes they are replacing.
      // This is currently true for transforms that use replaceOps (replace_bootstrap and
      // replace_resources), but may not be true for new transforms.
      if (getTypeChecker && removeOps.length + replaceOps.length > 0) {
        const removedNodes = removeOps.concat(replaceOps).map((op) => op.target);
        removeOps.push(...elideImports(sf, removedNodes, getTypeChecker));
      }

      const visitor: ts.Visitor = (node) => {
        let modified = false;
        let modifiedNodes = [node];
        // Check if node should be dropped.
        if (removeOps.find((op) => op.target === node)) {
          modifiedNodes = [];
          modified = true;
        }

        // Check if node should be replaced (only replaces with first op found).
        const replace = replaceOps.find((op) => op.target === node);
        if (replace) {
          modifiedNodes = [replace.replacement];
          modified = true;
        }

        // Check if node should be added to.
        const add = addOps.filter((op) => op.target === node);
        if (add.length > 0) {
          modifiedNodes = [
            ...add.filter((op) => op.before).map(((op) => op.before)),
            ...modifiedNodes,
            ...add.filter((op) => op.after).map(((op) => op.after)),
          ] as ts.Node[];
          modified = true;
        }

        // If we changed anything, return modified nodes without visiting further.
        if (modified) {
          return modifiedNodes;
        } else {
          // Otherwise return node as is and visit children.
          return visitEachChild(node, visitor, context);
        }
      };

      // Don't visit the sourcefile at all if we don't have ops for it.
      if (ops.length === 0) {
        return sf;
      }

      const result = ts.visitNode(sf, visitor);

      // If we removed any decorators, we need to clean up the decorator arrays.
      if (removeOps.some((op) => op.target.kind === ts.SyntaxKind.Decorator)) {
        cleanupDecorators(result);
      }

      return result;
    };

    return transformer;
  };
}

/**
 * This is a version of `ts.visitEachChild` that works that calls our version
 * of `updateSourceFileNode`, so that typescript doesn't lose type information
 * for property decorators.
 * See https://github.com/Microsoft/TypeScript/issues/17384 (fixed by
 * https://github.com/Microsoft/TypeScript/pull/20314 and released in TS 2.7.0) and
 * https://github.com/Microsoft/TypeScript/issues/17551 (fixed by
 * https://github.com/Microsoft/TypeScript/pull/18051 and released on TS 2.5.0).
 */
function visitEachChildWorkaround(
  node: ts.Node,
  visitor: ts.Visitor,
  context: ts.TransformationContext,
) {

  if (node.kind === ts.SyntaxKind.SourceFile) {
    const sf = node as ts.SourceFile;
    const statements = ts.visitLexicalEnvironment(sf.statements, visitor, context);

    if (statements === sf.statements) {
      return sf;
    }
    // Note: Need to clone the original file (and not use `ts.updateSourceFileNode`)
    // as otherwise TS fails when resolving types for decorators.
    const sfClone = ts.getMutableClone(sf);
    sfClone.statements = statements;

    return sfClone;
  }

  return ts.visitEachChild(node, visitor, context);
}


// 1) If TS sees an empty decorator array, it will still emit a `__decorate` call.
//    This seems to be a TS bug.
// 2) Also ensure nodes with modified decorators have parents
//    built in TS transformers assume certain nodes have parents (fixed in TS 2.7+)
function cleanupDecorators(node: ts.Node) {
  if (node.decorators) {
    if (node.decorators.length == 0) {
      node.decorators = undefined;
    } else if (node.parent == undefined) {
      const originalNode = ts.getParseTreeNode(node);
      node.parent = originalNode.parent;
    }
  }

  ts.forEachChild(node, node => cleanupDecorators(node));
}
