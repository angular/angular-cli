/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Build Error"', () => {
    it('emits errors', async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        watch: true,
      });

      // Generate an error
      await harness.appendToFile('src/main.server.ts', `const foo: = 'abc';`);

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/TS1110:.*Type expected/),
        }),
      );
    });
  });
});
