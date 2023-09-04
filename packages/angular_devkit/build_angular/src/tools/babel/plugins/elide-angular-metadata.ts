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
 * Name of the asynchronous Angular class metadata function created by the Angular compiler.
 */
const SET_CLASS_METADATA_ASYNC_NAME = 'ɵsetClassMetadataAsync';

/**
 * Provides one or more keywords that if found within the content of a source file indicate
 * that this plugin should be used with a source file.
 *
 * @returns An a string iterable containing one or more keywords.
 */
export function getKeywords(): Iterable<string> {
  return [SET_CLASS_METADATA_NAME, SET_CLASS_METADATA_ASYNC_NAME];
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
        const callArguments = path.node.arguments;

        // The function being called must be the metadata function name
        let calleeName;
        if (types.isMemberExpression(callee) && types.isIdentifier(callee.property)) {
          calleeName = callee.property.name;
        } else if (types.isIdentifier(callee)) {
          calleeName = callee.name;
        }

        if (
          calleeName !== undefined &&
          (isRemoveClassMetadataCall(calleeName, callArguments) ||
            isRemoveClassmetadataAsyncCall(calleeName, callArguments))
        ) {
          // The metadata function is always emitted inside a function expression
          const parent = path.getFunctionParent();

          if (parent && (parent.isFunctionExpression() || parent.isArrowFunctionExpression())) {
            // Replace the metadata function with `void 0` which is the equivalent return value
            // of the metadata function.
            path.replaceWith(path.scope.buildUndefinedNode());
          }
        }
      },
    },
  };
}

/** Determines if a function call is a call to `setClassMetadata`. */
function isRemoveClassMetadataCall(name: string, args: types.CallExpression['arguments']): boolean {
  // `setClassMetadata` calls have to meet the following criteria:
  // * First must be an identifier
  // * Second must be an array literal
  return (
    name === SET_CLASS_METADATA_NAME &&
    args.length === 4 &&
    types.isIdentifier(args[0]) &&
    types.isArrayExpression(args[1])
  );
}

/** Determines if a function call is a call to `setClassMetadataAsync`. */
function isRemoveClassmetadataAsyncCall(
  name: string,
  args: types.CallExpression['arguments'],
): boolean {
  // `setClassMetadataAsync` calls have to meet the following criteria:
  // * First argument must be an identifier.
  // * Second argument must be an inline function.
  // * Third argument must be an inline function.
  return (
    name === SET_CLASS_METADATA_ASYNC_NAME &&
    args.length === 3 &&
    types.isIdentifier(args[0]) &&
    isInlineFunction(args[1]) &&
    isInlineFunction(args[2])
  );
}

/** Determines if a node is an inline function expression. */
function isInlineFunction(node: types.Node): boolean {
  return types.isFunctionExpression(node) || types.isArrowFunctionExpression(node);
}
