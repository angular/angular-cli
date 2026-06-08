/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  setupConditionImport,
  setTargetMapping,
} from '../../../../../../../../modules/testing/builder/src/dev_prod_mode';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "conditional imports"', () => {
    beforeEach(async () => {
      await setupConditionImport(harness);
    });

    interface ImportsTestCase {
      name: string;
      mapping: unknown;
      output?: string;
    }

    const GOOD_TARGET = './src/good.js';
    const BAD_TARGET = './src/bad.js';

    const testCases: ImportsTestCase[] = [
      { name: 'simple string', mapping: GOOD_TARGET },
      {
        name: 'default fallback without matching condition',
        mapping: {
          'never': BAD_TARGET,
          'default': GOOD_TARGET,
        },
      },
      {
        name: 'development condition',
        mapping: {
          'development': BAD_TARGET,
          'default': GOOD_TARGET,
        },
      },
      {
        name: 'production condition',
        mapping: {
          'production': GOOD_TARGET,
          'default': BAD_TARGET,
        },
      },
      {
        name: 'browser condition (in browser)',
        mapping: {
          'browser': GOOD_TARGET,
          'default': BAD_TARGET,
        },
      },
      {
        name: 'browser condition (in server)',
        output: 'server/main.server.mjs',
        mapping: {
          'browser': BAD_TARGET,
          'default': GOOD_TARGET,
        },
      },
    ];

    for (const testCase of testCases) {
      describe(testCase.name, () => {
        beforeEach(async () => {
          await setTargetMapping(harness, testCase.mapping);
        });

        it('resolves to expected target', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            optimization: true,
            ssr: true,
            server: 'src/main.ts',
          });

          const { result } = await harness.executeOnce();

          expect(result?.success).toBeTrue();
          const outputFile = `dist/${testCase.output ?? 'browser/main.js'}`;
          harness.expectFile(outputFile).content.toContain('"good-value"');
          harness.expectFile(outputFile).content.not.toContain('"bad-value"');
        });
      });
    }

    it('fails type-checking when import contains differing type', async () => {
      await setTargetMapping(harness, {
        'development': './src/wrong.ts',
        'default': './src/good.ts',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: false,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('TS2339'),
        }),
      );
    });
  });
});
