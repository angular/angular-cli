/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "tsConfig"', () => {
    it('throws an exception when TypeScript Configuration file does not exist', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        tsConfig: 'src/missing.json',
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnException: false });

      expect(result).toBeUndefined();
      expect(error).toEqual(
        jasmine.objectContaining({
          message: jasmine.stringMatching('no such file or directory'),
        }),
      );
    });
  });
});
