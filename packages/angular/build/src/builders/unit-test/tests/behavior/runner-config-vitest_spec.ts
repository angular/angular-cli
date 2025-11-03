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

const VITEST_CONFIG_CONTENT = `
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    reporters: [['junit', { outputFile: './vitest-results.xml' }]],
  },
});
`;

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "runnerConfig with Vitest runner"', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    it('should use custom reporters defined in runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile('vitest.config.ts', VITEST_CONFIG_CONTENT);

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('vitest-results.xml').toExist();
    });

    it('should exclude test files based on runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile(
        'vitest.config.ts',
        `
              import { defineConfig } from 'vitest/config';
              export default defineConfig({
                test: {
                  exclude: ['src/app/app.component.spec.ts'],
                  reporters: ['default', ['json', { outputFile: 'vitest-results.json' }]],
                },
              });
              `,
      );

      // Create a second test file that should be executed
      harness.writeFile(
        'src/app/app-second.spec.ts',
        `
              import { TestBed } from '@angular/core/testing';
              import { AppComponent } from './app.component';

              describe('AppComponent', () => {
                  beforeEach(() => TestBed.configureTestingModule({
                                    declarations: [AppComponent],
                                  }));

                it('should create the app', () => {
                  const fixture = TestBed.createComponent(AppComponent);
                  const app = fixture.componentInstance;
                  expect(app).toBeTruthy();
                });
              });
              `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const results = JSON.parse(harness.readFile('vitest-results.json'));
      expect(results.numPassedTests).toBe(1);
    });
    it('should allow overriding builder options via runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile(
        'vitest.config.ts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          test: {
            globals: false,
          },
        });
        `,
      );

      // This test will fail if globals are enabled, because `test` will not be defined.
      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { vi, test, expect } from 'vitest';
        test('should pass', () => {
          expect(true).toBe(true);
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });

    it('should fail when a DOM-dependent test is run in a node environment', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile(
        'vitest.config.ts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          test: {
            environment: 'node',
          },
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });
  });
});
