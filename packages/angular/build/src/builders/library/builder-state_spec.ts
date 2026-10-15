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

  describe('file reference tracking', () => {
    it('should expand transitive multi-hop references and ignore self-references', () => {
      const state = new BuilderState();
      const compTs = '/workspace/projects/my-lib/src/lib/comp.ts';
      const compScss = '/workspace/projects/my-lib/src/lib/comp.scss';
      const varsScss = '/workspace/projects/my-lib/src/lib/_vars.scss';

      state.addFileReferences(compTs, [compTs, compScss, varsScss]);
      state.addFileReferences(compScss, [compScss, varsScss]);

      expect(state.watchedCompilationFiles.has(compTs)).toBeTrue();
      expect(state.watchedCompilationFiles.has(compScss)).toBeTrue();
      expect(state.watchedCompilationFiles.has(varsScss)).toBeTrue();

      const affected = state.getAffectedFiles([varsScss]);
      expect(affected).toEqual(new Set([varsScss, compTs, compScss]));

      // Subsequent getAffectedFiles calls preserve mappings when not yet overwritten
      const affectedAgain = state.getAffectedFiles([varsScss]);
      expect(affectedAgain).toEqual(new Set([varsScss, compTs, compScss]));
    });

    it('should accumulate references across multiple stylesheets for the same containing file', () => {
      const state = new BuilderState();
      const compTs = '/workspace/projects/my-lib/src/lib/comp.ts';
      const firstPartial = '/workspace/projects/my-lib/src/lib/_first.scss';
      const secondPartial = '/workspace/projects/my-lib/src/lib/_second.scss';

      state.addFileReferences(compTs, [compTs, firstPartial]);
      state.addFileReferences(compTs, [compTs, secondPartial]);

      expect(state.getAffectedFiles([firstPartial])).toEqual(new Set([firstPartial, compTs]));
      expect(state.getAffectedFiles([secondPartial])).toEqual(new Set([secondPartial, compTs]));
    });

    it('should prune stale references when a containing file is cleared and re-recorded', () => {
      const state = new BuilderState();
      const compTs = '/workspace/projects/my-lib/src/lib/comp.ts';
      const oldPartial = '/workspace/projects/my-lib/src/lib/_old.scss';
      const newPartial = '/workspace/projects/my-lib/src/lib/_new.scss';

      state.addFileReferences(compTs, [compTs, oldPartial]);
      expect(state.getAffectedFiles([oldPartial])).toEqual(new Set([oldPartial, compTs]));

      // Clear and re-record references for compTs without oldPartial
      state.clearFileReferences([compTs]);
      state.addFileReferences(compTs, [compTs, newPartial]);
      expect(state.getAffectedFiles([oldPartial])).toEqual(new Set([oldPartial]));
      expect(state.getAffectedFiles([newPartial])).toEqual(new Set([newPartial, compTs]));
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
