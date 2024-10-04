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
  describe('Option: "main"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    beforeEach(async () => {
      await harness.writeFiles({
        'src/magic.ts': `Object.assign(globalThis, {MAGIC_IS_REAL: true});`,
        'src/magic.spec.ts': `
            declare const MAGIC_IS_REAL: boolean;
            describe('Magic', () => {
              it('can be scientificially proven to be true', () => {
                expect(typeof MAGIC_IS_REAL).toBe('boolean');
              });
            });`,
      });
      // Remove this test, we don't expect it to pass with our setup script.
      await harness.removeFile('src/app/app.component.spec.ts');

      // Add src/magic.ts to tsconfig.
      interface TsConfig {
        files: string[];
      }
      const tsConfig = JSON.parse(harness.readFile('src/tsconfig.spec.json')) as TsConfig;
      tsConfig.files.push('magic.ts');
      await harness.writeFile('src/tsconfig.spec.json', JSON.stringify(tsConfig));
    });

    it('uses custom setup file', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        main: './src/magic.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
