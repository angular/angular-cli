/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { NodePath, PluginObj, types } from '@babel/core';

/**
 * The name of the Angular class metadata function created by the Angular compiler.
 */
const SET_CLASS_METADATA_NAME = 'ɵsetClassMetadata';

/**
 * Provides one or more keywords that if found within the content of a source file indicate
 * that this plugin should be used with a source file.
 *
 * @returns An a string iterable containing one or more keywords.
 */
export function getKeywords(): Iterable<string> {
  return [SET_CLASS_METADATA_NAME];
}

/**
 * A babel plugin factory function for eliding the Angular class metadata function (`ɵsetClassMetadata`).
 *
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  return {
    visitor: {
      CallExpression(path: NodePath<types.CallExpression>) {
        const callee = path.node.callee;

        // The function being called must be the metadata function name
        let calleeName;
        if (types.isMemberExpression(callee) && types.isIdentifier(callee.property)) {
          calleeName = callee.property.name;
        } else if (types.isIdentifier(callee)) {
          calleeName = callee.name;
        }
        if (calleeName !== SET_CLASS_METADATA_NAME) {
          return;
        }

        // There must be four arguments that meet the following criteria:
        // * First must be an identifier
        // * Second must be an array literal
        const callArguments = path.node.arguments;
        if (
          callArguments.length !== 4 ||
          !types.isIdentifier(callArguments[0]) ||
          !types.isArrayExpression(callArguments[1])
        ) {
          return;
        }

        // The metadata function is always emitted inside a function expression
        if (!path.getFunctionParent()?.isFunctionExpression()) {
          return;
        }

        // Replace the metadata function with `void 0` which is the equivalent return value
        // of the metadata function.
        path.replaceWith(path.scope.buildUndefinedNode());
      },
    },
  };
}
