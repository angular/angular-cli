/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Diagnostic, Diagnostics, Program } from '@angular/compiler-cli';
import * as ts from 'typescript';
import { time, timeEnd } from './benchmark';

export enum DiagnosticMode {
  Syntactic = 1 << 0,
  Semantic = 1 << 1,

  All = Syntactic | Semantic,
  Default = All,
}

export class CancellationToken implements ts.CancellationToken {
  private _isCancelled = false;

  requestCancellation() {
    this._isCancelled = true;
  }

  isCancellationRequested() {
    return this._isCancelled;
  }

  throwIfCancellationRequested() {
    if (this.isCancellationRequested()) {
      throw new ts.OperationCanceledException();
    }
  }
}

export function hasErrors(diags: Diagnostics) {
  return diags.some(d => d.category === ts.DiagnosticCategory.Error);
}

export function gatherDiagnostics(
  program: ts.Program | Program,
  jitMode: boolean,
  benchmarkLabel: string,
  mode = DiagnosticMode.All,
  cancellationToken?: CancellationToken,
): Diagnostics {
  const allDiagnostics: Array<ts.Diagnostic | Diagnostic> = [];
  let checkOtherDiagnostics = true;

  function checkDiagnostics<T extends Function>(fn: T) {
    if (checkOtherDiagnostics) {
      const diags = fn(undefined, cancellationToken);
      if (diags) {
        allDiagnostics.push(...diags);

        checkOtherDiagnostics = !hasErrors(diags);
      }
    }
  }

  const gatherSyntacticDiagnostics = (mode & DiagnosticMode.Syntactic) != 0;
  const gatherSemanticDiagnostics = (mode & DiagnosticMode.Semantic) != 0;

  if (jitMode) {
    const tsProgram = program as ts.Program;
    if (gatherSyntacticDiagnostics) {
      // Check syntactic diagnostics.
      time(`${benchmarkLabel}.gatherDiagnostics.ts.getSyntacticDiagnostics`);
      checkDiagnostics(tsProgram.getSyntacticDiagnostics.bind(tsProgram));
      timeEnd(`${benchmarkLabel}.gatherDiagnostics.ts.getSyntacticDiagnostics`);
    }

    if (gatherSemanticDiagnostics) {
      // Check semantic diagnostics.
      time(`${benchmarkLabel}.gatherDiagnostics.ts.getSemanticDiagnostics`);
      checkDiagnostics(tsProgram.getSemanticDiagnostics.bind(tsProgram));
      timeEnd(`${benchmarkLabel}.gatherDiagnostics.ts.getSemanticDiagnostics`);
    }
  } else {
    const angularProgram = program as Program;
    if (gatherSyntacticDiagnostics) {
      // Check TypeScript syntactic diagnostics.
      time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);
      checkDiagnostics(angularProgram.getTsSyntacticDiagnostics.bind(angularProgram));
      timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);
    }

    if (gatherSemanticDiagnostics) {
      // Check TypeScript semantic and Angular structure diagnostics.
      time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);
      checkDiagnostics(angularProgram.getTsSemanticDiagnostics.bind(angularProgram));
      timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);

      // Check Angular semantic diagnostics
      time(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);
      checkDiagnostics(angularProgram.getNgSemanticDiagnostics.bind(angularProgram));
      timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);
    }
  }

  return allDiagnostics;
}
