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
  setupApplicationTarget,
  UNIT_TEST_BUILDER_INFO,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "setupFiles"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when a setup file does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      // TODO: Re-enable once Vite logs are remapped through build system
      // expectLog(logs, `The specified setup file "src/setup.ts" does not exist.`);
    });

    it('should include the setup files', async () => {
      await harness.writeFiles({
        'src/setup.ts': `(globalThis as any).setupLoaded = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest'
        describe('AppComponent', () => {
          test('should create the app', () => {
            expect((globalThis as any).setupLoaded).toBe(true);
          });
        });`,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('setup.ts');
        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should allow setup files to configure testing module', async () => {
      await harness.writeFiles({
        'src/setup.ts': `
        import { TestBed } from '@angular/core/testing';
        import { beforeEach } from 'vitest';
        import { SETUP_LOADED_TOKEN } from './setup-loaded-token';

        beforeEach(() => {
          TestBed.configureTestingModule({
            providers: [{provide: SETUP_LOADED_TOKEN, useValue: true}],
          });
        });
        `,
        'src/setup-loaded-token.ts': `
        import { InjectionToken } from '@angular/core';

        export const SETUP_LOADED_TOKEN = new InjectionToken<boolean>('SETUP_LOADED_TOKEN');
        `,
        'src/app/app.component.spec.ts': `
        import { beforeEach, describe, expect, test } from 'vitest';
        import { TestBed } from '@angular/core/testing';
        import { SETUP_LOADED_TOKEN } from '../setup-loaded-token';

        describe('AppComponent', () => {
          test('should create the app', () => {
            expect(TestBed.inject(SETUP_LOADED_TOKEN)).toBe(true);
          });
        });`,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('setup.ts');
        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
