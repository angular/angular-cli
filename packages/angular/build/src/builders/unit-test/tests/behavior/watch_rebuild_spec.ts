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
  describe('Watch Mode Behavior', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should re-run tests when a non-spec file changes', async () => {
      // Set up a component with a testable value and a spec that checks it
      harness.writeFiles({
        'src/app/app.component.ts': `
          import { Component } from '@angular/core';
          @Component({ selector: 'app-root', template: '' })
          export class AppComponent {
            title = 'hello';
          }`,
        'src/app/app.component.spec.ts': `
          import { describe, expect, test } from 'vitest';
          import { AppComponent } from './app.component';
          describe('AppComponent', () => {
            test('should have correct title', () => {
              const app = new AppComponent();
              expect(app.title).toBe('hello');
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        // 1. Initial run should succeed
        ({ result }) => {
          expect(result?.success).toBeTrue();

          // 2. Modify only the non-spec component file (change the title value)
          harness.writeFiles({
            'src/app/app.component.ts': `
              import { Component } from '@angular/core';
              @Component({ selector: 'app-root', template: '' })
              export class AppComponent {
                title = 'changed';
              }`,
          });
        },
        // 3. Test should re-run and fail because the title changed
        ({ result }) => {
          expect(result?.success).toBeFalse();
        },
      ]);
    });

    it('should run tests when a compilation error is fixed and a test failure is introduced simultaneously', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        // 1. Initial success
        ({ result }) => {
          expect(result?.success).toBeTrue();

          // 2. Introduce compilation error
          harness.writeFiles({
            'src/app/app.component.spec.ts': `
              import { describe, expect, test } from 'vitest'
              describe('AppComponent', () => {
                test('should create the app', () => {
                  expect(true).toBe(true); // Syntax error incoming
                  const x: string = 1; // Type error
                });
              });`,
          });
        },
        // 3. Expect compilation error
        ({ result }) => {
          expect(result?.success).toBeFalse();

          // 4. Fix compilation error BUT introduce test failure
          harness.writeFiles({
            'src/app/app.component.spec.ts': `
              import { describe, expect, test } from 'vitest'
              describe('AppComponent', () => {
                test('should create the app', () => {
                  expect(true).toBe(false); // Logic failure
                });
              });`,
          });
        },
        // 5. Expect test failure (NOT success, which would happen if the test was skipped)
        ({ result }) => {
          expect(result?.success).toBeFalse();
        },
      ]);
    });
  });
});
