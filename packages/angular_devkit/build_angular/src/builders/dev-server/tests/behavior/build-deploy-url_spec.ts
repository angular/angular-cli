/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { serveWebpackBrowser } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "browser builder deployUrl"', () => {
    beforeEach(() => {
      setupBrowserTarget(harness, {
        deployUrl: 'test/',
      });
    });

    it('uses the deploy URL defined in the "browserTarget" options as the serve path', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'runtime.js');

      expect(result?.success).toBeTrue();
      expect(result?.baseUrl).toMatch(/\/test$/);
      expect(response?.url).toMatch(/\/test\/runtime.js$/);
      expect(await response?.text()).toContain('self["webpackChunk"]');
    });
  });
});
