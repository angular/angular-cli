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
  describe('Option: "providersFile"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when providersFile does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        providersFile: 'src/my.providers.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Could not resolve "./my.providers"'),
        }),
      );
    });

    it('should use providers from the specified file', async () => {
      await harness.writeFiles({
        'src/my.providers.ts': `
          import { importProvidersFrom } from '@angular/core';
          import { CommonModule } from '@angular/common';
          export default [importProvidersFrom(CommonModule)];
        `,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('my.providers.ts');

        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        providersFile: 'src/my.providers.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
