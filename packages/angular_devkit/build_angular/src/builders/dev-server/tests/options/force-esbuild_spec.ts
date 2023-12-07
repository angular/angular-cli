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

const ESBUILD_LOG_TEXT = 'Application bundle generation complete.';
const WEBPACK_LOG_TEXT = 'Compiled successfully.';

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
    describe('option: "forceEsbuild"', () => {
      beforeEach(async () => {
        setupTarget(harness, {});

        // Application code is not needed for these tests
        await harness.writeFile('src/main.ts', 'console.log("foo");');
      });

      it('should use build target specified build system when not present', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          forceEsbuild: undefined,
        });

        const { result, response, logs } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('console.log');
        expect(logs).toContain(
          jasmine.objectContaining({
            message: jasmine.stringMatching(isViteRun ? ESBUILD_LOG_TEXT : WEBPACK_LOG_TEXT),
          }),
        );
      });

      it('should use build target specified build system when false', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          forceEsbuild: false,
        });

        const { result, response, logs } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('console.log');
        expect(logs).toContain(
          jasmine.objectContaining({
            message: jasmine.stringMatching(isViteRun ? ESBUILD_LOG_TEXT : WEBPACK_LOG_TEXT),
          }),
        );
      });

      it('should always use the esbuild build system with Vite when true', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          forceEsbuild: true,
        });

        const { result, response, logs } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('console.log');
        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching(ESBUILD_LOG_TEXT) }),
        );
      });
    });
  },
);
