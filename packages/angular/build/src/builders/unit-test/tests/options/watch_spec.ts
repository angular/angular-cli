/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "watch"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should run tests once when watch is false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should re-run tests when a file changes when watch is true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();

          await harness.writeFiles({
            'src/app/app.component.spec.ts': `
              import { describe, expect, test } from 'vitest'
              describe('AppComponent', () => {
                test('should create the app', () => {
                  expect(true).toBe(false);
                });
              });`,
          });
        },
        ({ result }) => {
          expect(result?.success).toBeFalse();
        },
      ]);
    });

    it('should disable the Vite server file watcher when watch is true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
        runnerConfig: 'vitest.config.mts',
      });

      await harness.writeFile(
        'vitest.config.mts',
        `
          import { defineConfig } from 'vitest/config';
          export default defineConfig({
            plugins: [
              {
                name: 'assert-watch-disabled',
                configureVitest({ vitest, project }) {
                  if (vitest.vite.config.server.watch !== null || project.vite.config.server.watch !== null) {
                    throw new Error('Expected Vite server.watch to be null');
                  }
                },
              },
            ],
          });
        `,
      );

      await harness.executeWithCases([
        ({ result }) => {
          expect(result?.success).toBeTrue();
        },
      ]);
    });
  });
});
