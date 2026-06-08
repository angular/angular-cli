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
  describe('Options: "reporter" and "outputFile"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it(`should output a JSON report`, async () => {
      await harness.removeFile('src/app/app.component.spec.ts');
      await harness.writeFiles({
        'src/app/services/test.service.spec.ts': `
          describe('TestService', () => {
            it('should succeed', () => {
              expect(true).toBe(true);
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: ['json'],
        outputFile: 'test-report.json',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      const reportContent = await harness.readFile('test-report.json');
      expect(reportContent).toContain('TestService');
    });
  });
});
