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
  program: Program,
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

  // Check TypeScript syntactic diagnostics.
  time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);
  checkOtherDiagnostics = checkOtherDiagnostics &&
    checkDiagnostics(program.getTsSyntacticDiagnostics(undefined, cancellationToken));
  timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSyntacticDiagnostics`);

  // Check TypeScript semantic and Angular structure diagnostics.
  time(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);
  checkOtherDiagnostics = checkOtherDiagnostics &&
    checkDiagnostics(program.getTsSemanticDiagnostics(undefined, cancellationToken));
  timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getTsSemanticDiagnostics`);

  // Check Angular semantic diagnostics
  time(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);
  checkOtherDiagnostics = checkOtherDiagnostics &&
    checkDiagnostics(program.getNgSemanticDiagnostics(undefined, cancellationToken));
  timeEnd(`${benchmarkLabel}.gatherDiagnostics.ng.getNgSemanticDiagnostics`);

  return allDiagnostics;
}
