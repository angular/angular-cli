/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  setTargetMapping,
  setupConditionImport,
} from '../../../../../../../../modules/testing/builder/src/dev_prod_mode';
import { execute } from '../../builder';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "customConditions"', () => {
    const GOOD_TARGET = './src/good.js';
    const BAD_TARGET = './src/bad.js';

    beforeEach(async () => {
      setupApplicationTarget(harness);
      await setupConditionImport(harness);

      // The spec file imports the conditionally-resolved module and only passes
      // when it resolves to `good.ts`. If `compilerOptions.customConditions`
      // from the test tsconfig is not honored, resolution falls through to
      // `bad.ts` and the assertion fails.
      await harness.writeFile(
        'src/app/conditions.spec.ts',
        `
          import { VALUE } from '#target';
          describe('custom conditions', () => {
            it('should resolve through the test tsconfig customConditions', () => {
              expect(VALUE).toBe('good-value');
            });
          });
        `,
      );

      // Ensure good/bad sources are reachable by the spec compilation and that
      // bundler-mode resolution is enabled so `#target` is resolved via the
      // package.json imports map.
      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.compilerOptions ??= {};
        tsConfig.compilerOptions.moduleResolution = 'bundler';
        tsConfig.files ??= [];
        tsConfig.files.push('good.ts', 'bad.ts', 'wrong.ts');

        return JSON.stringify(tsConfig);
      });
    });

    it('uses tsconfig customConditions when buildTarget has none', async () => {
      // Map `#target` so only the `staging` condition resolves to the good
      // target. The unit-test builder must read `customConditions` from the
      // test tsconfig and forward them to the application build, otherwise
      // resolution falls back to the `default` entry.
      await setTargetMapping(harness, {
        staging: GOOD_TARGET,
        default: BAD_TARGET,
      });

      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.compilerOptions ??= {};
        tsConfig.compilerOptions.customConditions = ['staging'];

        return JSON.stringify(tsConfig);
      });

      harness.useTarget('test', { ...BASE_OPTIONS });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('does not apply unrelated conditions when tsconfig declares none', async () => {
      // Same mapping but no `customConditions` declared in the tsconfig: the
      // `staging` entry must NOT be selected, resolution must land on the
      // `default` (bad) target, and the spec assertion must fail.
      await setTargetMapping(harness, {
        staging: GOOD_TARGET,
        default: BAD_TARGET,
      });

      harness.useTarget('test', { ...BASE_OPTIONS });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });
  });
});
