/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "Errors"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('should fail when there is a TypeScript error', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      await harness.appendToFile('src/app/app.component.spec.ts', `console.lo('foo')`);

      const { result } = await harness.executeOnce({
        outputLogsOnFailure: false,
      });

      expect(result?.success).toBeFalse();
    });
  });
});
