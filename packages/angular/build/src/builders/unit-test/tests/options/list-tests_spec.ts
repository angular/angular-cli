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
  describe('Option: "listTests"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);

      await harness.writeFiles({
        'src/app/app.component.spec.ts':
          'describe("AppComponent", () => { it("should...", () => {}); });',
        'src/app/other.spec.ts': 'describe("Other", () => { it("should...", () => {}); });',
        'src/app/ignored.ts': 'export const a = 1;',
      });
    });

    it('should list all discovered tests and exit when true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        listTests: true,
      });

      const { result, logs } = await harness.executeOnce();

      // Should succeed and exit without running tests
      expect(result?.success).toBe(true);

      // Should log the discovered test files
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Discovered test files:/) }),
      );
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/.*app\.component\.spec\.ts/),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/.*other\.spec\.ts/) }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/.*ignore\.ts/) }),
      );

      // Should NOT log output from the test runner (since it shouldn't run)
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Application bundle generation complete/),
        }),
      );
    });

    it('should not list tests and should run them as normal when false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        listTests: false,
      });

      const { result, logs } = await harness.executeOnce();

      // Should succeed because the tests pass
      expect(result?.success).toBe(true);

      // Should NOT log the discovered test files
      expect(logs).not.toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Discovered test files:/) }),
      );

      // Should log output from the test runner
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Application bundle generation complete/),
        }),
      );
    });
  });
});
