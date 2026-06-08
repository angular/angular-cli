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
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "tsConfig"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should use "tsconfig.spec.json" by default when it exists', async () => {
      const { tsConfig, ...rest } = BASE_OPTIONS;
      harness.useTarget('test', rest);

      // Create tsconfig.spec.json
      await harness.writeFile(
        'tsconfig.spec.json',
        `{ "extends": "./tsconfig.json", "compilerOptions": { "types": ["jasmine"] }, "include": ["src/**/*.ts"] }`,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      // TODO: Add expectation that the file was used.
    });

    it('should use build target tsConfig when "tsconfig.spec.json" does not exist', async () => {
      const { tsConfig, ...rest } = BASE_OPTIONS;
      harness.useTarget('test', rest);

      // The build target tsconfig is not setup to build the tests and should fail
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });

    it('should fail when user specified tsConfig does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        tsConfig: 'random/tsconfig.spec.json',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expectLog(logs, `The specified tsConfig file 'random/tsconfig.spec.json' does not exist.`);
    });
  });
});
