/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { NodePath, PluginObj } from '@babel/core';

/**
 * The name of the Angular class metadata function created by the Angular compiler.
 */
const SET_CLASS_METADATA_NAME = 'ɵsetClassMetadata';

/**
 * Name of the asynchronous Angular class metadata function created by the Angular compiler.
 */
const SET_CLASS_METADATA_ASYNC_NAME = 'ɵsetClassMetadataAsync';

/**
 * Name of the function that sets debug information on classes.
 */
const SET_CLASS_DEBUG_INFO_NAME = 'ɵsetClassDebugInfo';

/**
 * Provides one or more keywords that if found within the content of a source file indicate
 * that this plugin should be used with a source file.
 *
 * @returns An a string iterable containing one or more keywords.
 */
export function getKeywords(): Iterable<string> {
  return Object.keys(angularMetadataFunctions);
}

/**
 * An object map of function names and related value checks for discovery of Angular generated
 * metadata calls.
 */
const angularMetadataFunctions: Record<string, (args: NodePath[]) => boolean> = {
  [SET_CLASS_METADATA_NAME]: isSetClassMetadataCall,
  [SET_CLASS_METADATA_ASYNC_NAME]: isSetClassMetadataAsyncCall,
  [SET_CLASS_DEBUG_INFO_NAME]: isSetClassDebugInfoCall,
};

/**
 * A babel plugin factory function for eliding the Angular class metadata function (`ɵsetClassMetadata`).
 *
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  return {
    visitor: {
      CallExpression(path) {
        const callee = path.get('callee');

        // The function being called must be the metadata function name
        let calleeName;
        if (callee.isMemberExpression()) {
          const calleeProperty = callee.get('property');
          if (calleeProperty.isIdentifier()) {
            calleeName = calleeProperty.node.name;
          }
        } else if (callee.isIdentifier()) {
          calleeName = callee.node.name;
        }

        if (!calleeName) {
          return;
        }

        if (
          Object.hasOwn(angularMetadataFunctions, calleeName) &&
          angularMetadataFunctions[calleeName](path.get('arguments'))
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
function isSetClassMetadataCall(callArguments: NodePath[]): boolean {
  // `setClassMetadata` calls have to meet the following criteria:
  // * First must be an identifier
  // * Second must be an array literal
  return (
    callArguments.length === 4 &&
    callArguments[0].isIdentifier() &&
    callArguments[1].isArrayExpression()
  );
}

/** Determines if a function call is a call to `setClassMetadataAsync`. */
function isSetClassMetadataAsyncCall(callArguments: NodePath[]): boolean {
  // `setClassMetadataAsync` calls have to meet the following criteria:
  // * First argument must be an identifier.
  // * Second argument must be an inline function.
  // * Third argument must be an inline function.
  return (
    callArguments.length === 3 &&
    callArguments[0].isIdentifier() &&
    isInlineFunction(callArguments[1]) &&
    isInlineFunction(callArguments[2])
  );
}

/** Determines if a function call is a call to `setClassDebugInfo`. */
function isSetClassDebugInfoCall(callArguments: NodePath[]): boolean {
  return (
    callArguments.length === 2 &&
    callArguments[0].isIdentifier() &&
    callArguments[1].isObjectExpression()
  );
}

/** Determines if a node is an inline function expression. */
function isInlineFunction(path: NodePath): boolean {
  return path.isFunctionExpression() || path.isArrowFunctionExpression();
}
