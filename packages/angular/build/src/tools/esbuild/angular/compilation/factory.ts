/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { useParallelTs } from '../../../../utils/environment-options';
import type { AngularCompilation } from './angular-compilation';

/**
 * Creates an Angular compilation object that can be used to perform Angular application
 * compilation either for AOT or JIT mode. By default a parallel compilation is created
 * that uses a Node.js worker thread.
 * @param jit True, for Angular JIT compilation; False, for Angular AOT compilation.
 * @returns An instance of an Angular compilation object.
 */
export async function createAngularCompilation(jit: boolean): Promise<AngularCompilation> {
  if (useParallelTs) {
    const { ParallelCompilation } = await import('./parallel-compilation');

    return new ParallelCompilation(jit);
  }

  if (jit) {
    const { JitCompilation } = await import('./jit-compilation');

    return new JitCompilation();
  } else {
    const { AotCompilation } = await import('./aot-compilation');

    return new AotCompilation();
  }
}
