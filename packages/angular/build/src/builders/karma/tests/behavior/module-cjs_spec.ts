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
  describe('Behavior: "module commonjs"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('should work when module is commonjs', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.compilerOptions.moduleResolution = 'bundler';
        tsConfig.compilerOptions.module = 'commonjs';

        return JSON.stringify(tsConfig);
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
