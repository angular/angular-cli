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
  xdescribe('Option: "reporters"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should use the default reporter when none is specified', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/DefaultReporter/) }),
      );
    });

    it('should use a custom reporter when specified', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: ['json'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/JsonReporter/) }),
      );
    });
  });
});
