/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
*/
import { Compilation, WebpackError } from 'webpack';

export function addWarning(compilation: Compilation, message: string): void {
  compilation.warnings.push(new WebpackError(message));
}

export function addError(compilation: Compilation, message: string): void {
  compilation.errors.push(new WebpackError(message));
}
