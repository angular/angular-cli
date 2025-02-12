/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NodePath, PluginObj, types } from '@babel/core';
import { Visitor, programVisitor } from 'istanbul-lib-instrument';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

/**
 * A babel plugin factory function for adding istanbul instrumentation.
 *
 * @returns A babel plugin object instance.
 */
export default function (): PluginObj {
  const visitors = new WeakMap<NodePath, Visitor>();

  return {
    visitor: {
      Program: {
        enter(path, state) {
          const inputSourceMap = // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (state.file.inputMap as undefined | { toObject(): Record<string, any> })?.toObject();

          // istanbul does not support URL as sources.
          if (inputSourceMap?.sources) {
            inputSourceMap.sources = inputSourceMap.sources.map((s: string) =>
              s.startsWith('file://') ? fileURLToPath(s) : s,
            );
          }

          const visitor = programVisitor(types, state.filename, {
            // Babel returns a Converter object from the `convert-source-map` package
            inputSourceMap,
          });
          visitors.set(path, visitor);

          visitor.enter(path);
        },
        exit(path) {
          const visitor = visitors.get(path);
          assert(visitor, 'Instrumentation visitor should always be present for program path.');

          visitor.exit(path);
          visitors.delete(path);
        },
      },
    },
  };
}
