/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { concatMap, count, debounceTime, take, timeout } from 'rxjs';
import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';
import { BuilderOutput } from '@angular-devkit/architect';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget, isApplicationBuilder) => {
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

      interface OutputCheck {
        (result: BuilderOutput | undefined): Promise<void>;
      }

      const expectedSequence: OutputCheck[] = [
        async (result) => {
          // Karma run should succeed.
          // Add a compilation error.
          expect(result?.success).toBeTrue();
          // Add an syntax error to a non-main file.
          await harness.appendToFile('src/app/app.component.spec.ts', `error`);
        },
        async (result) => {
          expect(result?.success).toBeFalse();
          await harness.writeFile('src/app/app.component.spec.ts', goodFile);
        },
        async (result) => {
          expect(result?.success).toBeTrue();
        },
      ];
      if (isApplicationBuilder) {
        expectedSequence.unshift(async (result) => {
          // This is the initial Karma run, it should succeed.
          // For simplicity, we trigger a run the first time we build in watch mode.
          expect(result?.success).toBeTrue();
        });
      }

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(60000),
          debounceTime(500),
          concatMap(async ({ result }, index) => {
            await expectedSequence[index](result);
          }),
          take(expectedSequence.length),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(expectedSequence.length);
    });
  });
});
