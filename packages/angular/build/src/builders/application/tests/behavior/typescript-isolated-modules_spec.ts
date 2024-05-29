/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "TypeScript isolated modules direct transpilation"', () => {
    it('should successfully build with isolated modules enabled and disabled optimizations', async () => {
      // Enable tsconfig isolatedModules option in tsconfig
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.isolatedModules = true;

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });

    it('should successfully build with isolated modules enabled and enabled optimizations', async () => {
      // Enable tsconfig isolatedModules option in tsconfig
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.isolatedModules = true;

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });
  });
});
