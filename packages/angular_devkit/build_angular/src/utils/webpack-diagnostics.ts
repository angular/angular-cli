/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Compilation } from 'webpack';

export function addWarning(compilation: Compilation, message: string): void {
  compilation.warnings.push(new compilation.compiler.webpack.WebpackError(message));
}

export function addError(compilation: Compilation, message: string): void {
  compilation.errors.push(new compilation.compiler.webpack.WebpackError(message));
}
