/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "hmr"', () => {
    beforeEach(() => {
      setupBrowserTarget(harness);
    });

    it('should not show a CommonJS usage warning when enabled', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        hmr: true,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('CommonJS or AMD dependencies'),
        }),
      );
    });
  });
});
