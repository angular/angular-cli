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
  describe('Option: "providersFile"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when providersFile does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        providersFile: 'src/my.providers.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Could not resolve "./my.providers"'),
        }),
      );
    });

    it('should use providers from the specified file', async () => {
      await harness.writeFiles({
        'src/my.providers.ts': `
          import { importProvidersFrom } from '@angular/core';
          import { CommonModule } from '@angular/common';
          export default [importProvidersFrom(CommonModule)];
        `,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('my.providers.ts');

        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        providersFile: 'src/my.providers.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should work with providers that inject services requiring JIT compilation', async () => {
      // This test reproduces the issue from https://github.com/angular/angular-cli/issues/31993
      // where using providersFile with a service that injects Router causes JIT compilation errors
      await harness.writeFiles({
        'src/test.service.ts': `
          import { Injectable, inject } from '@angular/core';
          import { Router } from '@angular/router';

          @Injectable({ providedIn: 'root' })
          export class TestService {
            router = inject(Router);
          }
        `,
        'src/test.providers.ts': `
          import { TestService } from './test.service';
          export default [TestService];
        `,
        'src/app/app.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { AppComponent } from './app.component';
          import { TestService } from '../test.service';
          import { describe, expect, it } from 'vitest';

          describe('AppComponent', () => {
            it('should create the app and inject TestService', () => {
              TestBed.configureTestingModule({
                declarations: [AppComponent],
              });
              const fixture = TestBed.createComponent(AppComponent);
              const app = fixture.componentInstance;
              const testService = TestBed.inject(TestService);
              expect(app).toBeTruthy();
              expect(testService).toBeTruthy();
              expect(testService.router).toBeTruthy();
            });
          });
        `,
      });
      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('test.service.ts', 'test.providers.ts');

        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        providersFile: 'src/test.providers.ts',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
