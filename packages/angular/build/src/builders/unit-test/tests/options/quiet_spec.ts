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
  expectNoLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "quiet"', () => {
    let originalCI: string | undefined;

    beforeEach(async () => {
      setupApplicationTarget(harness);
      originalCI = process.env['CI'];
    });

    afterEach(() => {
      if (originalCI !== undefined) {
        process.env['CI'] = originalCI;
      } else {
        delete process.env['CI'];
      }
    });

    it('should default to true (quiet) when CI is not set', async () => {
      delete process.env['CI'];

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      // Should not contain the stats table headers
      expectNoLog(logs, /Initial chunk files/);
    });

    it('should default to false (verbose) when CI is set', async () => {
      process.env['CI'] = 'true';

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      // Should contain the stats table headers or file listing
      expectLog(logs, /Application bundle generation complete/);
    });

    it('should respect quiet: true explicitly', async () => {
      process.env['CI'] = 'false'; // Ensure CI doesn't interfere if it defaults to false

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        quiet: true,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, /Initial chunk files/);
    });

    it('should respect quiet: false explicitly', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        quiet: false,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      // On initial build, it should print the file list
      expectLog(logs, /Initial/);
    });
  });
});
