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
  describe('Behavior: "preserveWhitespaces warning"', () => {
    it('should not show warning when "preserveWhitespaces" is not set.', async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      const { logs } = await harness.executeOnce();
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('"preserveWhitespaces" was set in'),
        }),
      );
    });
    it('should show warning when "preserveWhitespaces" is set.', async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      await harness.modifyFile('src/tsconfig.server.json', (content) => {
        const tsconfig = JSON.parse(content);
        (tsconfig.angularCompilerOptions ??= {}).preserveWhitespaces = false;

        return JSON.stringify(tsconfig);
      });

      const { logs } = await harness.executeOnce();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('"preserveWhitespaces" was set in'),
        }),
      );
    });
  });
});
