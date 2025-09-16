/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO, expectLog, expectNoLog } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "Rebuild Error Detection"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    it('Emits full build result with incremental enabled and initial build has errors', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
      });

      // Missing ending `>` on the div will cause an error
      await harness.appendToFile('src/app/app.component.html', '<div>Hello, world!</div');

      await harness.executeWithCases(
        [
          async ({ result, logs }) => {
            expect(result?.success).toBeFalse();
            debugger;
            expectLog(logs, 'Unexpected character "EOF"');

            await harness.appendToFile('src/app/app.component.html', '>');
          },
          ({ result, logs }) => {
            expect(result?.success).toBeTrue();
            expectNoLog(logs, 'Unexpected character "EOF"');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });
  });
});
