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
  xdescribe('Option: "tsConfig"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when tsConfig is not provided', async () => {
      const { tsConfig, ...rest } = BASE_OPTIONS;
      harness.useTarget('test', rest as any);

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(/"tsConfig" is required/);
    });

    it('should fail when tsConfig is empty', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        tsConfig: '',
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must NOT have fewer than 1 characters/,
      );
    });

    it('should fail when tsConfig does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        tsConfig: 'src/tsconfig.spec.json',
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result).toBeUndefined();
      expect(error?.message).toMatch(
        `The specified tsConfig file "src/tsconfig.spec.json" does not exist.`,
      );
    });
  });
});
