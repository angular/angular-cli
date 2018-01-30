/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview This adapts the buildOptimizer to run over each file as it is
 * processed by Rollup. We must do this since buildOptimizer expects to see the
 * ESModules in the input sources, and therefore cannot run on the rollup output
 */

import * as path from 'path';
import { RawSourceMap } from 'source-map';
import { buildOptimizer } from './build-optimizer';

const DEBUG = false;

export interface Options {
  sideEffectFreeModules?: string[];
}

export default function optimizer(options: Options) {
  return {
    name: 'build-optimizer',
    transform: (content: string, id: string): {code: string, map: RawSourceMap}|null => {
      const isSideEffectFree = options.sideEffectFreeModules &&
        options.sideEffectFreeModules.some(m => id.indexOf(m) >= 0);
      const { content: code, sourceMap: map } = buildOptimizer({
        content, inputFilePath: id, emitSourceMap: true, isSideEffectFree,
      });
      if (!code) {
        if (DEBUG) {
          console.error('no transforms produced by buildOptimizer for '
             + path.relative(process.cwd(), id));
        }

        return null;
      }
      if (!map) {
        throw new Error('no sourcemap produced by buildOptimizer');
      }

      return { code, map };
    },
  };
}
