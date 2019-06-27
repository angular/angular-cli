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
  angularCoreModules?: string[];
}

export default function optimizer(options: Options) {
  // Normalize paths for comparison.
  if (options.sideEffectFreeModules) {
    options.sideEffectFreeModules = options.sideEffectFreeModules.map(p => p.replace(/\\/g, '/'));
  }

  return {
    name: 'build-optimizer',
    transform: (content: string, id: string): { code: string; map: RawSourceMap } | null => {
      const normalizedId = id.replace(/\\/g, '/');
      const isSideEffectFree =
        options.sideEffectFreeModules &&
        options.sideEffectFreeModules.some(m => normalizedId.indexOf(m) >= 0);
      const isAngularCoreFile =
        options.angularCoreModules &&
        options.angularCoreModules.some(m => normalizedId.indexOf(m) >= 0);
      const { content: code, sourceMap: map } = buildOptimizer({
        content,
        inputFilePath: id,
        emitSourceMap: true,
        isSideEffectFree,
        isAngularCoreFile,
      });
      if (!code) {
        if (DEBUG) {
          // tslint:disable-next-line: no-console
          console.error(
            'no transforms produced by buildOptimizer for ' + path.relative(process.cwd(), id),
          );
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
