/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "buildTarget sourceMap"', () => {
    beforeEach(async () => {
      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', 'console.log("foo");');
    });

    it('should not include sourcemaps when disabled', async () => {
      setupTarget(harness, {
        sourceMap: false,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');
      expect(result?.success).toBeTrue();
      expect(await response?.text()).not.toContain('//# sourceMappingURL=');
    });

    it('should include sourcemaps when enabled', async () => {
      setupTarget(harness, {
        sourceMap: true,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');
      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain('//# sourceMappingURL=');
    });
  });
});
