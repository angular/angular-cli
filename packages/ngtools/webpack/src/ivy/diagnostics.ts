/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Diagnostics, formatDiagnostics } from '@angular/compiler-cli';
import { DiagnosticCategory } from 'typescript';
import { Compilation } from 'webpack';
import { addError, addWarning } from '../webpack-diagnostics';

export type DiagnosticsReporter = (diagnostics: Diagnostics) => void;

export function createDiagnosticsReporter(
  compilation: Compilation,
): DiagnosticsReporter {
  return (diagnostics) => {
    for (const diagnostic of diagnostics) {
      const text = formatDiagnostics([diagnostic]);
      if (diagnostic.category === DiagnosticCategory.Error) {
        addError(compilation, text);
      } else {
        addWarning(compilation, text);
      }
    }
  };
}
