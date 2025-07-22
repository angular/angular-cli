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
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  xdescribe('Option: "browsers"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should use jsdom when browsers is not provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: undefined,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({ message: 'Using jsdom in Node.js for test execution.' }),
      );
    });

    it('should fail when browsers is empty', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: [],
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must NOT have fewer than 1 items/,
      );
    });

    it('should launch a browser when provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: ['chrome'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Starting browser "chrome"/) }),
      );
    });

    it('should launch a browser in headless mode when specified', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: ['chromeheadless'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Starting browser "chrome" in headless mode/),
        }),
      );
    });
  });
});
