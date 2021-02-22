/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "tsConfig"', () => {
    it('uses a provided TypeScript configuration file', async () => {
      // Setup a TS file that uses ES2015+ const and then target ES5.
      // The const usage should be downleveled in the output if the TS config is used.
      await harness.writeFile('src/main.ts', 'const a = 5; console.log(a);');
      await harness.writeFile(
        'src/tsconfig.option.json',
        JSON.stringify({
          compilerOptions: {
            target: 'es5',
            types: [],
          },
          files: ['main.ts'],
        }),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        tsConfig: 'src/tsconfig.option.json',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/main.js').content.not.toContain('const');
    });

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
