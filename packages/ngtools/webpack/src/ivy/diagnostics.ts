/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Diagnostics } from '@angular/compiler-cli';
import { DiagnosticCategory } from 'typescript';
import type { Compilation } from 'webpack';

export type DiagnosticsReporter = (diagnostics: Diagnostics) => void;

export function createDiagnosticsReporter(
  compilation: Compilation,
  formatter: (diagnostic: Diagnostics[number]) => string,
): DiagnosticsReporter {
  return (diagnostics) => {
    for (const diagnostic of diagnostics) {
      const text = formatter(diagnostic);
      if (diagnostic.category === DiagnosticCategory.Error) {
        addError(compilation, text);
      } else {
        addWarning(compilation, text);
      }
    }
  };
}

export function addWarning(compilation: Compilation, message: string): void {
  compilation.warnings.push(new compilation.compiler.webpack.WebpackError(message));
}

export function addError(compilation: Compilation, message: string): void {
  compilation.errors.push(new compilation.compiler.webpack.WebpackError(message));
}
