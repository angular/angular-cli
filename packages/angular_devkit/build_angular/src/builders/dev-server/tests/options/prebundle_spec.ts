/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

// TODO: Temporarily disabled pending investigation into test-only Vite not stopping when caching is enabled
describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
    // prebundling is not available in webpack
    (isViteRun ? xdescribe : xdescribe)('option: "prebundle"', () => {
      beforeEach(async () => {
        setupTarget(harness);

        harness.useProject('test', {
          cli: {
            cache: {
              enabled: true,
            },
          },
        });

        // Application code is not needed for these tests
        await harness.writeFile(
          'src/main.ts',
          `
          import { VERSION as coreVersion } from '@angular/core';
          import { VERSION as platformVersion } from '@angular/platform-browser';

          console.log(coreVersion);
          console.log(platformVersion);
        `,
        );
      });

      it('should prebundle dependencies when option is not present', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
        });

        const { result, content } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(content).toContain('vite/deps/@angular_core.js');
        expect(content).not.toContain('node_modules/@angular/core/');
      });

      it('should prebundle dependencies when option is set to true', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          prebundle: true,
        });

        const { result, content } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(content).toContain('vite/deps/@angular_core.js');
        expect(content).not.toContain('node_modules/@angular/core/');
      });

      it('should not prebundle dependencies when option is set to false', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          prebundle: false,
        });

        const { result, content } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(content).not.toContain('vite/deps/@angular_core.js');
        expect(content).toContain('node_modules/@angular/core/');
      });

      it('should not prebundle specified dependency if added to exclude list', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          prebundle: { exclude: ['@angular/platform-browser'] },
        });

        const { result, content } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(content).toContain('vite/deps/@angular_core.js');
        expect(content).not.toContain('node_modules/@angular/core/');
        expect(content).not.toContain('vite/deps/@angular_platform-browser.js');
        expect(content).toContain('node_modules/@angular/platform-browser/');
      });
    });
  },
);
