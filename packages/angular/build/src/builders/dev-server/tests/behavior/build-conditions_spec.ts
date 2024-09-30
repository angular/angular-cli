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
import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isApplicationBuilder) => {
    describe('Behavior: "conditional imports"', () => {
      if (!isApplicationBuilder) {
        it('requires esbuild', () => {
          expect(true).toBeTrue();
        });

        return;
      }

      beforeEach(async () => {
        setupTarget(harness);

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
            'development': GOOD_TARGET,
            'default': BAD_TARGET,
          },
        },
        {
          name: 'production condition',
          mapping: {
            'production': BAD_TARGET,
            'default': GOOD_TARGET,
          },
        },
        {
          name: 'browser condition (in browser)',
          mapping: {
            'browser': GOOD_TARGET,
            'default': BAD_TARGET,
          },
        },
      ];

      for (const testCase of testCases) {
        describe(testCase.name, () => {
          beforeEach(async () => {
            await setTargetMapping(harness, testCase.mapping);
          });

          it('resolves to expected target', async () => {
            harness.useTarget('serve', {
              ...BASE_OPTIONS,
            });

            const { result, response } = await executeOnceAndFetch(harness, '/main.js');

            expect(result?.success).toBeTrue();
            const output = await response?.text();
            expect(output).toContain('good-value');
            expect(output).not.toContain('bad-value');
          });
        });
      }
    });
  },
);
