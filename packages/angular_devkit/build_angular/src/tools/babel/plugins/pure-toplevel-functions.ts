/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { NodePath, PluginObj, types } from '@babel/core';
import annotateAsPure from '@babel/helper-annotate-as-pure';
import * as tslib from 'tslib';

/**
 * A cached set of TypeScript helper function names used by the helper name matcher utility function.
 */
const tslibHelpers = new Set<string>(Object.keys(tslib).filter((h) => h.startsWith('__')));

/**
 * Determinates whether an identifier name matches one of the TypeScript helper function names.
 *
 * @param name The identifier name to check.
 * @returns True, if the name matches a TypeScript helper name; otherwise, false.
 */
function isTslibHelperName(name: string): boolean {
  const nameParts = name.split('$');
  const originalName = nameParts[0];

  if (nameParts.length > 2 || (nameParts.length === 2 && isNaN(+nameParts[1]))) {
    return false;
  }

  return tslibHelpers.has(originalName);
}

/**
 * A babel plugin factory function for adding the PURE annotation to top-level new and call expressions.
 *
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  return {
    visitor: {
      CallExpression(path: NodePath<types.CallExpression>) {
        // If the expression has a function parent, it is not top-level
        if (path.getFunctionParent()) {
          return;
        }

        const callee = path.node.callee;
        if (types.isFunctionExpression(callee) && path.node.arguments.length !== 0) {
          return;
        }
        // Do not annotate TypeScript helpers emitted by the TypeScript compiler.
        // TypeScript helpers are intended to cause side effects.
        if (types.isIdentifier(callee) && isTslibHelperName(callee.name)) {
          return;
        }

        annotateAsPure(path);
      },
      NewExpression(path: NodePath<types.NewExpression>) {
        // If the expression has a function parent, it is not top-level
        if (!path.getFunctionParent()) {
          annotateAsPure(path);
        }
      },
    },
  };
}
