/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderState } from './builder-state';
import type { LibraryCompilationOutput, SingleProgramCache } from './types';

describe('BuilderState', () => {
  const packageJsonPath = '/workspace/projects/my-lib/package.json';
  const tsConfigPath = '/workspace/projects/my-lib/tsconfig.lib.json';
  const entryFilePath = '/workspace/projects/my-lib/src/public-api.ts';

  function createMockCache(closeSpy?: jasmine.Spy): SingleProgramCache {
    return {
      compilationInstance: {
        close: closeSpy,
      } as unknown as SingleProgramCache['compilationInstance'],
      esmFiles: new Map(),
      dtsFiles: new Map(),
      failedFiles: new Set(),
    };
  }

  function createMockCompilationOutput(
    overrides: Partial<LibraryCompilationOutput> = {},
  ): LibraryCompilationOutput {
    return {
      esmFiles: new Map(),
      dtsFiles: new Map(),
      changedEsmFiles: new Set(),
      changedDtsFiles: new Set(),
      referencedFiles: new Set(),
      cache: createMockCache(),
      hasStylesheetErrors: false,
      diagnosePromise: Promise.resolve(),
      declarationMap: false,
      compilationMode: 'partial',
      ...overrides,
    };
  }

  describe('ExecutionResult', () => {
    it('should track logs, warnings, and errors and reset per iteration', () => {
      const state = new BuilderState();
      expect(state.executionResult.hasErrors).toBeFalse();
      expect(state.executionResult.output).toEqual({ success: true });

      state.executionResult.addLog('Bundling my-lib');
      state.executionResult.addWarning('Unused import');
      state.executionResult.addWarnings(['Deprecated API']);
      state.executionResult.addError('Type error');
      state.executionResult.addErrors(['Syntax error']);

      expect(state.executionResult.logs).toEqual(['Bundling my-lib']);
      expect(state.executionResult.warnings).toEqual(['Unused import', 'Deprecated API']);
      expect(state.executionResult.errors).toEqual(['Type error', 'Syntax error']);
      expect(state.executionResult.hasErrors).toBeTrue();
      expect(state.executionResult.output).toEqual({ success: false });

      const freshResult = state.resetExecutionResult();
      expect(freshResult).toBe(state.executionResult);
      expect(freshResult.hasErrors).toBeFalse();
      expect(freshResult.logs).toEqual([]);
      expect(freshResult.warnings).toEqual([]);
      expect(freshResult.errors).toEqual([]);
    });
  });

  describe('shouldCompileEntryPoints & getCompilationModifiedFiles', () => {
    it('should preserve pending compilation files across aborted iterations', () => {
      const state = new BuilderState({
        packageJsonPath,
        tsConfigPath,
        entryPoints: new Map([
          [
            '.',
            {
              subpath: '.',
              name: '.',
              displayName: 'my-lib',
              bundleName: 'my-lib',
              entryFilePath,
              isPrimary: true,
            },
          ],
        ]),
      });

      state.recordCompilationOutput(
        createMockCompilationOutput({
          referencedFiles: new Set([entryFilePath]),
        }),
      );

      // Iteration 1: entryFilePath changes, but build aborts before recordCompilationOutput
      expect(
        state.shouldCompileEntryPoints(packageJsonPath, new Set([entryFilePath, packageJsonPath])),
      ).toBeTrue();

      // Iteration 2: only package.json changes on recovery
      expect(
        state.shouldCompileEntryPoints(packageJsonPath, new Set([packageJsonPath])),
      ).toBeTrue();
      expect(state.getCompilationModifiedFiles(new Set([packageJsonPath]))).toEqual(
        new Set([packageJsonPath, entryFilePath]),
      );

      // Once compilation output is recorded, pending compilation files are cleared
      state.recordCompilationOutput(createMockCompilationOutput());
      expect(
        state.shouldCompileEntryPoints(packageJsonPath, new Set([packageJsonPath])),
      ).toBeFalse();
    });

    it('should invalidate hasEmittedManifests when compilationMode changes', () => {
      const state = new BuilderState();
      state.hasEmittedManifests = true;
      state.recordCompilationOutput(createMockCompilationOutput({ compilationMode: 'partial' }));
      expect(state.hasEmittedManifests).toBeFalse();

      state.hasEmittedManifests = true;
      state.recordCompilationOutput(createMockCompilationOutput({ compilationMode: 'partial' }));
      expect(state.hasEmittedManifests).toBeTrue();

      state.recordCompilationOutput(createMockCompilationOutput({ compilationMode: 'full' }));
      expect(state.hasEmittedManifests).toBeFalse();
    });
  });

  describe('dispose', () => {
    it('should close compilationInstance and clear cached state on dispose', async () => {
      const closeSpy = jasmine.createSpy('close').and.resolveTo();
      const state = new BuilderState({ packageJsonPath });
      state.recordCompilationOutput(
        createMockCompilationOutput({
          cache: createMockCache(closeSpy),
          changedEsmFiles: new Set(['/a.js']),
          changedDtsFiles: new Set(['/a.d.ts']),
        }),
      );

      await state.dispose();

      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(state.singleProgramCache).toBeUndefined();
      expect(state.pendingChangedEsmFiles).toHaveSize(0);
      expect(state.pendingChangedDtsFiles).toHaveSize(0);
      expect(state.watchedCompilationFiles).toHaveSize(0);
    });
  });
});
