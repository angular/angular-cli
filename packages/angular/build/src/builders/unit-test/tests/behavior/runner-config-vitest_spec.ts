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

    it('should use custom reportsDirectory defined in runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
        coverage: true,
      });

      harness.writeFile(
        'vitest.config.ts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          test: {
            coverage: {
              reportsDirectory: './custom-coverage-reports',
            },
          },
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('custom-coverage-reports/coverage-final.json').toExist();
    });

    it('should use default reportsDirectory when not defined in runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile(
        'vitest.config.ts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          test: {
            coverage: {},
          },
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('coverage/test/coverage-final.json').toExist();
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

    it('should allow overriding globals to false via runnerConfig file', async () => {
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
        import { expect } from 'vitest';
        test('should pass', () => {
          expect(true).toBe(true);
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });

    it('should initialize environment even when globals are disabled in runnerConfig file', async () => {
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

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { test, expect } from 'vitest';
        test('should pass', () => {
          expect(true).toBe(true);
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
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

    it('should warn and ignore "test.projects" option from runnerConfig file', async () => {
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
            projects: ['./foo.config.ts'],
          },
        });
        `,
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // TODO: Re-enable once Vite logs are remapped through build system
      // expect(logs).toContain(
      //   jasmine.objectContaining({
      //     level: 'warn',
      //     message: jasmine.stringMatching(
      //       'The "test.projects" option in the Vitest configuration file is not supported.',
      //     ),
      //   }),
      // );
    });

    it('should warn and ignore "test.include" option from runnerConfig file', async () => {
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
            include: ['src/app/non-existent.spec.ts'],
          },
        });
        `,
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // TODO: Re-enable once Vite logs are remapped through build system
      // expect(logs).toContain(
      //   jasmine.objectContaining({
      //     level: 'warn',
      //     message: jasmine.stringMatching(
      //       'The "test.include" option in the Vitest configuration file is not supported.',
      //     ),
      //   }),
      // );
    });

    it(`should append "test.setupFiles" (string) from runnerConfig to the CLI's setup`, async () => {
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
            setupFiles: './src/app/custom-setup.ts',
          },
        });
        `,
      );

      harness.writeFile('src/app/custom-setup.ts', `(globalThis as any).customSetupLoaded = true;`);

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { test, expect } from 'vitest';
        test('should have custom setup loaded', () => {
          expect((globalThis as any).customSetupLoaded).toBe(true);
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it(`should append "test.setupFiles" (array) from runnerConfig to the CLI's setup`, async () => {
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
            setupFiles: ['./src/app/custom-setup-1.ts', './src/app/custom-setup-2.ts'],
          },
        });
        `,
      );

      harness.writeFile('src/app/custom-setup-1.ts', `(globalThis as any).customSetup1 = true;`);
      harness.writeFile('src/app/custom-setup-2.ts', `(globalThis as any).customSetup2 = true;`);

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { test, expect } from 'vitest';
        test('should have custom setups loaded', () => {
          expect((globalThis as any).customSetup1).toBe(true);
          expect((globalThis as any).customSetup2).toBe(true);
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should merge and apply custom Vite plugins from runnerConfig file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerConfig: 'vitest.config.ts',
      });

      harness.writeFile(
        'vitest.config.ts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          plugins: [
            {
              name: 'my-custom-transform-plugin',
              transform(code, id) {
                if (code.includes('__PLACEHOLDER__')) {
                  return code.replace('__PLACEHOLDER__', 'transformed by custom plugin');
                }
              },
            },
          ],
        });
        `,
      );

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { test, expect } from 'vitest';
        test('should have been transformed by custom plugin', () => {
          const placeholder = '__PLACEHOLDER__';
          expect(placeholder).toBe('transformed by custom plugin');
        });
        `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
