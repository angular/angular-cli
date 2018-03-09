// @ignoreDep typescript
import * as ts from 'typescript';

import { time, timeEnd } from './benchmark';
import { Program, Diagnostic, Diagnostics } from './ngtools_api';


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
  cancellationToken?: CancellationToken,
): Diagnostics {
  const allDiagnostics: Array<ts.Diagnostic | Diagnostic> = [];
  let checkOtherDiagnostics = true;

  function checkDiagnostics(diags: Diagnostics | undefined) {
    if (diags) {
      allDiagnostics.push(...diags);
      return !hasErrors(diags);
    }
    return true;
  }

  if (jitMode) {
    const tsProgram = program as ts.Program;
    // Check syntactic diagnostics.
    time(`${benchmarkLabel}.gatherDiagnostics.ts.getSyntacticDiagnostics`);
    checkOtherDiagnostics = checkOtherDiagnostics &&
      checkDiagnostics(tsProgram.getSyntacticDiagnostics(undefined, cancellationToken));
    timeEnd(`${benchmarkLabel}.gatherDiagnostics.ts.getSyntacticDiagnostics`);

    // Check semantic diagnostics.
    time(`${benchmarkLabel}.gatherDiagnostics.ts.getSemanticDiagnostics`);
    checkOtherDiagnostics = checkOtherDiagnostics &&
      checkDiagnostics(tsProgram.getSemanticDiagnostics(undefined, cancellationToken));
    timeEnd(`${benchmarkLabel}.gatherDiagnostics.ts.getSemanticDiagnostics`);
  } else {
    const angularProgram = program as Program;

    // Check TypeScript syntactic diagnostics.
    time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);
    checkOtherDiagnostics = checkOtherDiagnostics &&
      checkDiagnostics(angularProgram.getTsSyntacticDiagnostics(undefined, cancellationToken));
    timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);

    // Check TypeScript semantic and Angular structure diagnostics.
    time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);
    checkOtherDiagnostics = checkOtherDiagnostics &&
      checkDiagnostics(angularProgram.getTsSemanticDiagnostics(undefined, cancellationToken));
    timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);

    // Check Angular semantic diagnostics
    time(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);
    checkOtherDiagnostics = checkOtherDiagnostics &&
      checkDiagnostics(angularProgram.getNgSemanticDiagnostics(undefined, cancellationToken));
    timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);
  }

  return allDiagnostics;
}
