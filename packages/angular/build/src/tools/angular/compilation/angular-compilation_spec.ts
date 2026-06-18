/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import type ts from 'typescript';
import * as diagnosticsModule from '../../esbuild/angular/diagnostics';
import * as profilingModule from '../../esbuild/profiling';
import type { AngularHostOptions } from '../angular-host';
import { AngularCompilation, DiagnosticModes, EmitFileResult } from './angular-compilation';

/**
 * Minimal stub for the TypeScript module: only DiagnosticCategory is accessed in diagnoseFiles.
 */
const MOCK_TYPESCRIPT = {
  DiagnosticCategory: { Error: 1, Warning: 0, Message: 2, Suggestion: 3 },
} as unknown as typeof ts;

/** Concrete subclass used to control collectDiagnostics behaviour in tests. */
class ConcreteCompilation extends AngularCompilation {
  private diagnostics_: ts.Diagnostic[] = [];
  private throwError_: Error | undefined;

  setDiagnostics(diagnostics: ts.Diagnostic[]): void {
    this.diagnostics_ = diagnostics;
  }

  setThrowError(error: Error): void {
    this.throwError_ = error;
  }

  override async initialize(
    _tsconfig: string,
    _hostOptions: AngularHostOptions,
    _compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
    compilerOptions: ng.CompilerOptions;
    referencedFiles: readonly string[];
  }> {
    return {
      affectedFiles: new Set(),
      compilerOptions: {} as ng.CompilerOptions,
      referencedFiles: [],
    };
  }

  override emitAffectedFiles(): Iterable<EmitFileResult> {
    return [];
  }

  protected override *collectDiagnostics(_modes: DiagnosticModes): Iterable<ts.Diagnostic> {
    if (this.throwError_) {
      throw this.throwError_;
    }
    yield* this.diagnostics_;
  }

  protected override shouldFlushPerformanceTimings(): boolean {
    return true;
  }
}

describe('AngularCompilation.diagnoseFiles', () => {
  let compilation: ConcreteCompilation;
  let resetSpy: jasmine.Spy;
  let logSpy: jasmine.Spy;
  let profileAsyncSpy: jasmine.Spy;

  beforeEach(() => {
    compilation = new ConcreteCompilation();

    resetSpy = spyOn(profilingModule, 'resetCumulativeDurations');
    logSpy = spyOn(profilingModule, 'logCumulativeDurations');
    // Default: transparent passthrough so the real loop still runs.
    profileAsyncSpy = spyOn(profilingModule, 'profileAsync').and.callFake(
      <T>(_name: string, action: () => Promise<T>): Promise<T> => action(),
    );
    spyOn(AngularCompilation, 'loadTypescript').and.resolveTo(MOCK_TYPESCRIPT);
  });

  it('calls resetCumulativeDurations once before profileAsync', async () => {
    const callOrder: string[] = [];
    resetSpy.and.callFake(() => {
      callOrder.push('reset');
    });
    profileAsyncSpy.and.callFake(async (_name: string, action: () => Promise<unknown>) => {
      callOrder.push('profileAsync');
      return action();
    });

    await compilation.diagnoseFiles();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['reset', 'profileAsync']);
  });

  it('calls logCumulativeDurations once after profileAsync completes, even with no diagnostics', async () => {
    const callOrder: string[] = [];
    profileAsyncSpy.and.callFake(async (_name: string, action: () => Promise<unknown>) => {
      const result = await action();
      callOrder.push('profileAsync-done');
      return result;
    });
    logSpy.and.callFake(() => {
      callOrder.push('log');
    });

    await compilation.diagnoseFiles();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['profileAsync-done', 'log']);
  });

  it('returns correct errors and warnings, unaffected by profiling calls', async () => {
    const errorDiagnostic = { category: 1 /* Error */ } as ts.Diagnostic;
    const warningDiagnostic = { category: 0 /* Warning */ } as ts.Diagnostic;
    compilation.setDiagnostics([errorDiagnostic, warningDiagnostic]);

    spyOn(diagnosticsModule, 'convertTypeScriptDiagnostic').and.callFake(
      (_ts: typeof ts, diagnostic: ts.Diagnostic): PartialMessage => ({
        text: diagnostic.category === 1 ? 'error message' : 'warning message',
      }),
    );

    const result = await compilation.diagnoseFiles();

    expect(result.errors).toEqual([{ text: 'error message' }]);
    expect(result.warnings).toEqual([{ text: 'warning message' }]);
    // Profiling hooks ran but did not affect the diagnostic output.
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('calls logCumulativeDurations even when collectDiagnostics throws, and re-throws the error', async () => {
    // logCumulativeDurations sits in a finally block, so it always runs regardless of errors.
    compilation.setThrowError(new Error('diagnostics failure'));

    await expectAsync(compilation.diagnoseFiles()).toBeRejectedWithError('diagnostics failure');

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
