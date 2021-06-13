/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type as BudgetType } from '../../../';
import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "browser builder budgets"', () => {
    beforeEach(() => {
      setupBrowserTarget(harness, {
        // Add a budget error for any file over 100 bytes
        budgets: [{ type: BudgetType.All, maximumError: '100b' }],
        optimization: true,
      });
    });

    it('should ignore budgets defined in the "browserTarget" options', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });
  });
});
