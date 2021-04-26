/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { serveWebpackBrowser } from '../../index';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO, describeBuilder, setupBrowserTarget } from '../setup';

const VERBOSE_LOG_TEXT = /\[emitted\] \(name: main\)/;

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "verbose"', () => {
    beforeEach(() => {
      setupBrowserTarget(harness);
    });

    it('shows verbose logs in console when true', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        verbose: true,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(VERBOSE_LOG_TEXT) }),
      );
    });

    it('does not show verbose logs in console when false', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        verbose: false,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(VERBOSE_LOG_TEXT) }),
      );
    });

    it('does not show verbose logs in console when not present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(VERBOSE_LOG_TEXT) }),
      );
    });
  });
});
