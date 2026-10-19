/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BuilderState } from './builder-state';
import { createDiskOutputFile, createMemoryOutputFile } from './pipeline/utils';
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

  describe('output tracking and cleanup', () => {
    it('should track bundle and manifest outputs and queue stale files for deletion', () => {
      const state = new BuilderState();

      const initialBundles = new Map([
        [
          '.',
          {
            esmModuleIds: new Set(['/src/index.js']),
            dtsModuleIds: new Set(['/src/index.d.ts']),
            esmOutputFiles: new Set(['fesm2022/my-lib.mjs']),
            dtsOutputFiles: new Set(['types/my-lib.d.ts']),
            hasTslibImport: false,
          },
        ],
        [
          'testing',
          {
            esmModuleIds: new Set(['/testing/index.js']),
            dtsModuleIds: new Set(['/testing/index.d.ts']),
            esmOutputFiles: new Set(['fesm2022/my-lib-testing.mjs']),
            dtsOutputFiles: new Set(['types/my-lib-testing.d.ts']),
            hasTslibImport: true,
          },
        ],
      ]);

      state.recordBundleOutput(initialBundles);
      expect(state.hasTslibImport).toBeTrue();

      const initialFilesToDelete = state.recordEmittedOutputs(
        {
          filesToEmit: [],
          filesToDelete: [],
        },
        [
          createMemoryOutputFile('package.json', '{}'),
          createMemoryOutputFile('testing/package.json', '{}'),
        ],
      );
      expect(initialFilesToDelete).toHaveSize(0);
      expect(state.hasEmittedTslib).toBeTrue();

      // No-op bundle pass when nothing changed
      state.resetExecutionResult();
      state.recordBundleOutput(new Map());
      expect(state.recordEmittedOutputs({ filesToEmit: [], filesToDelete: [] })).toHaveSize(0);

      // Remove secondary entry point 'testing'
      state.resetExecutionResult();
      state.previousBundleResults.delete('testing');
      state.hasEntryPointsChanges = true;
      expect(state.hasTslibImport).toBeFalse();

      state.recordBundleOutput(new Map());
      const filesToDelete = state.recordEmittedOutputs(
        {
          filesToEmit: [],
          filesToDelete: [],
        },
        [createMemoryOutputFile('package.json', '{}')],
      );

      expect(state.hasEntryPointsChanges).toBeFalse();
      expect(state.hasEmittedTslib).toBeFalse();
      expect(filesToDelete).toEqual(
        new Set([
          'fesm2022/my-lib-testing.mjs',
          'types/my-lib-testing.d.ts',
          'testing/package.json',
        ]),
      );
    });

    it('should not delete an asset output path when another source still emits to it', () => {
      const state = new BuilderState();

      const sourceA = '/workspace/projects/my-lib/README.md';
      const sourceB = '/workspace/docs/README.md';

      state.recordEmittedOutputs({
        filesToEmit: [
          createDiskOutputFile(sourceA, 'README.md'),
          createDiskOutputFile(sourceB, 'README.md'),
        ],
        filesToDelete: [],
      });

      // Delete sourceB while sourceA remains active
      state.resetExecutionResult();
      const firstDeletes = state.recordEmittedOutputs({
        filesToEmit: [],
        filesToDelete: [sourceB],
      });
      expect(firstDeletes.has('README.md')).toBeFalse();

      // Delete sourceA as well; now README.md should be queued for deletion
      state.resetExecutionResult();
      const secondDeletes = state.recordEmittedOutputs({
        filesToEmit: [],
        filesToDelete: [sourceA],
      });
      expect(secondDeletes.has('README.md')).toBeTrue();
    });

    it('should preserve pending asset modifications across failed iterations', async () => {
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      const tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-builder-state-'));

      try {
        const readmePath = join(tempRoot, 'README.md');
        await writeFile(readmePath, '# Initial');

        const options = {
          workspaceRoot: tempRoot,
          assets: [{ glob: 'README.md', input: tempRoot, output: '.' }],
        };
        const state = new BuilderState(options);

        // Initial build emits README.md
        const initialAssets = await state.collectAssets(options);
        expect(initialAssets.filesToEmit).toHaveSize(1);
        state.recordEmittedOutputs(initialAssets);

        // Watch iteration 1: README.md is modified, but build fails before recordEmittedOutputs
        await writeFile(readmePath, '# Updated');
        const failedIterAssets = await state.collectAssets(options, new Set([readmePath]));
        expect(failedIterAssets.filesToEmit).toHaveSize(1);

        // Watch iteration 2: only an unrelated file is in modifiedFiles; README.md is still collected
        const unrelatedFile = join(tempRoot, 'src/index.ts');
        const recoveryAssets = await state.collectAssets(options, new Set([unrelatedFile]));
        expect(recoveryAssets.filesToEmit).toHaveSize(1);
        expect(recoveryAssets.filesToEmit[0]?.source).toBe(readmePath);

        // Once recovery outputs are recorded, pending asset modifications are cleared
        state.recordEmittedOutputs(recoveryAssets);
        const subsequentAssets = await state.collectAssets(options, new Set([unrelatedFile]));
        expect(subsequentAssets.filesToEmit).toHaveSize(0);
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    });

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
