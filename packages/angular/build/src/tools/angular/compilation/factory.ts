/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { useParallelTs } from '../../../utils/environment-options';
import type { AngularCompilation } from './angular-compilation';

/**
 * Creates an Angular compilation object that can be used to perform Angular application
 * compilation either for AOT or JIT mode. By default a parallel compilation is created
 * that uses a Node.js worker thread.
 * @param jit True, for Angular JIT compilation; False, for Angular AOT compilation.
 * @param browserOnlyBuild True, for browser only builds; False, for browser and server builds.
 * @returns An instance of an Angular compilation object.
 */
export async function createAngularCompilation(
  jit: boolean,
  browserOnlyBuild: boolean,
  parallel: boolean = useParallelTs,
): Promise<AngularCompilation> {
  if (parallel) {
    const { ParallelCompilation } = await import('./parallel-compilation');

    return new ParallelCompilation(jit, browserOnlyBuild);
  }

  if (jit) {
    const { JitCompilation } = await import('./jit-compilation');

    return new JitCompilation(browserOnlyBuild);
  } else {
    const { AotCompilation } = await import('./aot-compilation');

    return new AotCompilation(browserOnlyBuild);
  }
}
