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
  xdescribe('Option: "debug"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should not enter debug mode when debug is false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        debug: false,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, /Node.js inspector/);
    });

    it('should enter debug mode when debug is true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        debug: true,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectLog(logs, /Node.js inspector is active/);
    });
  });
});
