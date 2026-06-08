/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { NodePath, PluginObj, PluginPass, types } from '@babel/core';
import annotateAsPure from '@babel/helper-annotate-as-pure';
import * as tslib from 'tslib';

/**
 * A set of constructor names that are considered to be side-effect free.
 */
const sideEffectFreeConstructors = new Set<string>(['InjectionToken']);

/**
 * A set of TypeScript helper function names used by the helper name matcher utility function.
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

const babelHelpers = new Set<string>(['_defineProperty']);

/**
 * Determinates whether an identifier name matches one of the Babel helper function names.
 *
 * @param name The identifier name to check.
 * @returns True, if the name matches a Babel helper name; otherwise, false.
 */
function isBabelHelperName(name: string): boolean {
  return babelHelpers.has(name);
}

interface ExtendedPluginPass extends PluginPass {
  opts: { topLevelSafeMode?: boolean };
}

/**
 * A babel plugin factory function for adding the PURE annotation to top-level new and call expressions.
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  return {
    visitor: {
      CallExpression(path: NodePath<types.CallExpression>, state: ExtendedPluginPass) {
        const { topLevelSafeMode = false } = state.opts;
        if (topLevelSafeMode) {
          return;
        }

        // If the expression has a function parent, it is not top-level
        if (path.getFunctionParent()) {
          return;
        }

        const callee = path.get('callee');
        if (
          (callee.isFunctionExpression() || callee.isArrowFunctionExpression()) &&
          path.node.arguments.length !== 0
        ) {
          return;
        }

        // Do not annotate TypeScript helpers emitted by the TypeScript compiler or Babel helpers.
        // They are intended to cause side effects.
        if (
          callee.isIdentifier() &&
          (isTslibHelperName(callee.node.name) || isBabelHelperName(callee.node.name))
        ) {
          return;
        }

        annotateAsPure(path);
      },
      NewExpression(path: NodePath<types.NewExpression>, state: ExtendedPluginPass) {
        // If the expression has a function parent, it is not top-level
        if (path.getFunctionParent()) {
          return;
        }

        const { topLevelSafeMode = false } = state.opts;

        if (!topLevelSafeMode) {
          annotateAsPure(path);

          return;
        }

        const callee = path.get('callee');
        if (callee.isIdentifier() && sideEffectFreeConstructors.has(callee.node.name)) {
          annotateAsPure(path);
        }
      },
    },
  };
}
