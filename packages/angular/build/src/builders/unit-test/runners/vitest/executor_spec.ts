/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import path from 'node:path';
import type { Vitest } from 'vitest/node';
import { toPosixPath } from '../../../../utils/path';
import { type IncrementalResult, ResultKind } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import { VitestExecutor } from './executor';

describe('VitestExecutor', () => {
  describe('incremental rebuilds', () => {
    const workspaceRoot = path.resolve('/logical-workspace/test-project');
    const specFile = toPosixPath(path.join(workspaceRoot, 'src/app/app.spec.ts'));
    const incrementalResult: IncrementalResult = {
      kind: ResultKind.Incremental,
      added: [],
      removed: [],
      modified: ['spec-src-app-app-spec.js', 'chunk-ABCDEF.js'],
      files: [],
    };

    let originalExitCode: typeof process.exitCode;

    beforeEach(() => {
      // The executor resets the process exit code when executing.
      originalExitCode = process.exitCode;
    });

    afterEach(() => {
      process.exitCode = originalExitCode;
    });

    /**
     * Executes an incremental rebuild with a stand-in Vitest instance that uses the provided root.
     * The stand-in only has test specifications for the module ids in `knownModuleIds`.
     */
    async function executeIncremental(vitestRoot: string, knownModuleIds: string[]) {
      const executor = new VitestExecutor(
        'test-project',
        { workspaceRoot } as NormalizedUnitTestBuilderOptions,
        new Map([['spec-src-app-app-spec', specFile]]),
        { info: () => {} } as unknown as BuilderContext['logger'],
      );

      const invalidateFile = jasmine.createSpy('invalidateFile');
      const getModuleSpecifications = jasmine
        .createSpy('getModuleSpecifications')
        .and.callFake((moduleId: string) =>
          knownModuleIds.includes(moduleId) ? [{ moduleId }] : [],
        );
      const rerunTestSpecifications = jasmine
        .createSpy('rerunTestSpecifications')
        .and.resolveTo({ testModules: [{ ok: () => true }] });

      // Provide an already initialized Vitest instance to avoid starting Vitest.
      executor['vitest'] = {
        config: { root: vitestRoot },
        state: { getTestModules: () => [] },
        invalidateFile,
        getModuleSpecifications,
        rerunTestSpecifications,
      } as unknown as Vitest;

      const outputs = [];
      for await (const output of executor.execute(incrementalResult)) {
        outputs.push(output);
      }

      return { outputs, invalidateFile, getModuleSpecifications, rerunTestSpecifications };
    }

    it('uses workspace root based paths when the Vitest root is not aliased', async () => {
      const root = toPosixPath(workspaceRoot);
      const { outputs, invalidateFile, getModuleSpecifications, rerunTestSpecifications } =
        await executeIncremental(root, [specFile]);

      expect(invalidateFile.calls.allArgs()).toEqual([
        [`${root}/spec-src-app-app-spec.js`],
        [`${root}/chunk-ABCDEF.js`],
        [specFile],
      ]);
      expect(getModuleSpecifications.calls.allArgs()).toEqual([[specFile]]);
      expect(rerunTestSpecifications).toHaveBeenCalledOnceWith([{ moduleId: specFile }]);
      expect(outputs).toEqual([{ success: true }]);
    });

    it('rebases paths onto the Vitest root when the root is aliased', async () => {
      const physicalRoot = toPosixPath(path.resolve('/physical-disk/tmp/test-project'));
      const physicalSpecFile = `${physicalRoot}/src/app/app.spec.ts`;
      const { outputs, invalidateFile, getModuleSpecifications, rerunTestSpecifications } =
        await executeIncremental(physicalRoot, [physicalSpecFile]);

      expect(invalidateFile.calls.allArgs()).toEqual([
        [`${physicalRoot}/spec-src-app-app-spec.js`],
        [`${physicalRoot}/chunk-ABCDEF.js`],
        [physicalSpecFile],
      ]);
      expect(getModuleSpecifications.calls.allArgs()).toEqual([[physicalSpecFile]]);
      expect(rerunTestSpecifications).toHaveBeenCalledOnceWith([{ moduleId: physicalSpecFile }]);
      expect(outputs).toEqual([{ success: true }]);
    });
  });
});
