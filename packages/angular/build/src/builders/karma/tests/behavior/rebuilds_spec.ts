/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';
import { randomBytes } from 'node:crypto';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "Rebuilds"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('recovers from compilation failures in watch mode', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const goodFile = await harness.readFile('src/app/app.component.spec.ts');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            // Karma run should succeed.
            // Add a compilation error.
            expect(result?.success).withContext('Initial test run should succeed').toBeTrue();
            // Add an syntax error to a non-main file.
            await harness.appendToFile('src/app/app.component.spec.ts', `error`);
          },
          async ({ result }) => {
            expect(result?.success)
              .withContext('Test should fail after build error was introduced')
              .toBeFalse();
            await harness.writeFile('src/app/app.component.spec.ts', goodFile);
          },
          ({ result }) => {
            expect(result?.success)
              .withContext('Test should succeed again after build error was fixed')
              .toBeTrue();
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('correctly serves binary assets on rebuilds', async () => {
      await harness.writeFiles({
        './src/random.bin': randomBytes(1024),
        './src/app/app.component.spec.ts': `
            describe('AppComponent', () => {
              it('should fetch binary file with correct size', async () => {
                const resp = await fetch('/random.bin');
                const data = await resp.arrayBuffer();
                expect(data.byteLength).toBe(1024);
              });
            });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
        assets: ['src/random.bin'],
      });

      await harness.executeWithCases([
        async ({ result }) => {
          // Karma run should succeed.
          expect(result?.success).withContext('Initial test run should succeed').toBeTrue();
          // Modify test file to trigger a rebuild
          await harness.appendToFile(
            'src/app/app.component.spec.ts',
            `\n;console.log('modified');`,
          );
        },
        ({ result }) => {
          expect(result?.success).withContext('Test should succeed again').toBeTrue();
        },
      ]);
    });
  });
});
