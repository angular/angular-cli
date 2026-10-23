/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import KarmaTestRunner from './index';

describe('KarmaTestRunner', () => {
  describe('validateDependencies', () => {
    let projectSourceRoot: string;

    function createOptions(coverageEnabled: boolean): NormalizedUnitTestBuilderOptions {
      return {
        projectSourceRoot,
        coverage: { enabled: coverageEnabled },
      } as NormalizedUnitTestBuilderOptions;
    }

    beforeAll(async () => {
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      projectSourceRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-karma-runner-'));

      // A project with karma and karma-jasmine installed but not karma-coverage
      await writeFile(join(projectSourceRoot, 'package.json'), '{"name": "test-project"}');
      for (const packageName of ['karma', 'karma-jasmine']) {
        const packageRoot = join(projectSourceRoot, 'node_modules', packageName);
        await mkdir(packageRoot, { recursive: true });
        await writeFile(
          join(packageRoot, 'package.json'),
          JSON.stringify({ name: packageName, version: '0.0.0', main: 'index.js' }),
        );
        await writeFile(join(packageRoot, 'index.js'), '');
      }
    });

    it('does not require karma-coverage when coverage is disabled', () => {
      expect(() => KarmaTestRunner.validateDependencies?.(createOptions(false))).not.toThrow();
    });

    it('requires karma-coverage when coverage is enabled', () => {
      expect(() => KarmaTestRunner.validateDependencies?.(createOptions(true))).toThrowError(
        /karma-coverage/,
      );
    });
  });
});
