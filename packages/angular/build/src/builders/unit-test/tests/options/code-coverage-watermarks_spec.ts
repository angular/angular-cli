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
  describe('Option: "coverageWatermarks"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    // Any coverage percentage is at or above a 0% high watermark and below a 101% low watermark.
    for (const [watermark, level] of [
      [[0, 0], 'high'],
      [[101, 101], 'low'],
    ] as const) {
      it(`should mark coverage as "${level}" in the HTML report with ${watermark} watermarks`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          coverage: true,
          coverageReporters: ['html'] as any,
          coverageWatermarks: {
            statements: [...watermark],
            branches: [...watermark],
            functions: [...watermark],
            lines: [...watermark],
          },
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile('coverage/test/index.html').content.toContain(`status-line ${level}`);
      });
    }
  });
});
