/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when Web Worker files change"', () => {
    it('Recovers from error when directly referenced worker file is changed', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const workerCodeFile = `
        console.log('WORKER FILE');
      `;

      const errorText = `Expected ";" but found "~"`;

      // Create a worker file
      await harness.writeFile('src/app/worker.ts', workerCodeFile);

      // Create app component that uses the directive
      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core'
        @Component({
          selector: 'app-root',
          template: '<h1>Worker Test</h1>',
        })
        export class AppComponent {
          worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
      `,
      );

      const builderAbort = new AbortController();
      const buildCount = await harness
        .execute({ outputLogsOnFailure: false, signal: builderAbort.signal })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBeTrue();

                // Update the worker file to be invalid syntax
                await harness.writeFile('src/app/worker.ts', `asd;fj$3~kls;kd^(*fjlk;sdj---flk`);

                break;
              case 1:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(errorText),
                  }),
                );

                // Make an unrelated change to verify error cache was updated
                // Should persist error in the next rebuild
                await harness.modifyFile('src/main.ts', (content) => content + '\n');

                break;
              case 2:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(errorText),
                  }),
                );

                // Revert the change that caused the error
                // Should remove the error
                await harness.writeFile('src/app/worker.ts', workerCodeFile);

                break;
              case 3:
                expect(result?.success).toBeTrue();
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(errorText),
                  }),
                );

                // Make an unrelated change to verify error cache was updated
                // Should continue showing no error
                await harness.modifyFile('src/main.ts', (content) => content + '\n');

                break;
              case 4:
                expect(result?.success).toBeTrue();
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(errorText),
                  }),
                );

                // Test complete - abort watch mode
                builderAbort?.abort();
                break;
            }
          }),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(5);
    });
  });
});
