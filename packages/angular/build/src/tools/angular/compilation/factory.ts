/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { useParallelTs } from '../../../utils/environment-options';
import type { AngularCompilation } from './angular-compilation';

export type AngularCompilationMode = 'aot' | 'jit' | 'transform';

/**
 * Creates an Angular compilation object that can be used to perform Angular application
 * compilation either for AOT, JIT, or on-demand transform mode. By default a parallel compilation is created
 * that uses a Node.js worker thread.
 * @param mode True or 'jit' for JIT mode; False or 'aot' for AOT compilation; 'transform' for on-demand transformation.
 * @param browserOnlyBuild True, for browser only builds; False, for browser and server builds.
 * @param parallel True to execute compilation in a worker thread.
 * @returns An instance of an Angular compilation object.
 */
export async function createAngularCompilation(
  mode: boolean | AngularCompilationMode,
  browserOnlyBuild: boolean,
  parallel: boolean = useParallelTs,
): Promise<AngularCompilation> {
  if (mode === 'transform') {
    throw new Error('Transform compilation mode is not supported.');
  }

  const isJit = mode === true || mode === 'jit';

  if (parallel) {
    const { ParallelCompilation } = await import('./parallel-compilation');

    return new ParallelCompilation(isJit, browserOnlyBuild);
  }

  if (isJit) {
    const { JitCompilation } = await import('./jit-compilation');

    return new JitCompilation(browserOnlyBuild);
  } else {
    const { AotCompilation } = await import('./aot-compilation');

    return new AotCompilation(browserOnlyBuild);
  }
}
