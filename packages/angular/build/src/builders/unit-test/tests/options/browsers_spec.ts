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
  expectLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "browsers"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should use DOM emulation when browsers is not provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: undefined,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should fail when a browser is requested but no provider is installed', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: ['chrome'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expectLog(
        logs,
        `The "browsers" option requires either "@vitest/browser-playwright", "@vitest/browser-webdriverio", or "@vitest/browser-preview" to be installed`,
      );
    });
  });
});
