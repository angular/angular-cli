/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';

const WebpackError = require('webpack/lib/WebpackError');

export function addWarning(compilation: webpack.compilation.Compilation, message: string): void {
  compilation.warnings.push(new WebpackError(message));

}

export function addError(compilation: webpack.compilation.Compilation, message: string): void {
  compilation.errors.push(new WebpackError(message));

}
