/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Configuration } from 'webpack';

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';
import { ExecutionTransformer } from '../../../../transforms';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget, isApplicationBuilder) => {
  describe('Option: Custom file loader', () => {
    beforeEach(async () => {
      if (isApplicationBuilder) {
        pending('not implemented yet for application builder');
      }
      await setupTarget(harness);
    });

    beforeEach(async () => {
      await harness.writeFiles({
        'src/number-webpack-loader.js': `
            module.exports = (source) => {
              return 'export const DOUBLED = ' + (Number(source) * 2) + ';\\n';
            };`,
        'src/app/app.number': `42`,
        'src/app/app.number.d.ts': `export const DOUBLED: number;`,
        'src/app/app.component.spec.ts': `
            import { DOUBLED } from './app.number';
            describe('Custom webpack transform', () => {
              it('generates expected export', () => {
                expect(DOUBLED).toBe(84);
              });
            });`,
      });
    });

    it('applies the webpack configuration transform', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const webpackConfiguration: ExecutionTransformer<Configuration> = (config: Configuration) => {
        config.module ??= {};
        config.module.rules ??= [];
        config.module.rules.push({
          test: /\.number$/,
          loader: './src/number-webpack-loader.js',
        });
        return config;
      };

      const { result } = await harness.executeOnce({
        additionalExecuteArguments: [
          {
            webpackConfiguration,
          },
        ],
      });
      expect(result?.success).toBeTrue();
    });
  });
});
