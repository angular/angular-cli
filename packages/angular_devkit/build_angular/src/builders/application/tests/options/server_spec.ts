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
  beforeEach(async () => {
    await harness.modifyFile('src/tsconfig.app.json', (content) => {
      const tsConfig = JSON.parse(content);
      tsConfig.files ??= [];
      tsConfig.files.push('main.server.ts');

      return JSON.stringify(tsConfig);
    });
  });

  describe('Option: "server"', () => {
    it('uses a provided TypeScript file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: 'src/main.server.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').toExist();
    });

    it('does not write file to disk when "ssr" is "false"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: 'src/main.server.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').toExist();
    });

    it('uses a provided JavaScript file', async () => {
      await harness.writeFile('src/server.js', `console.log('server'); export default {};`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: 'src/server.js',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('fails and shows an error when file does not exist', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: 'src/missing.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching('Could not resolve "') }),
      );

      harness.expectFile('dist/browser/main.js').toNotExist();
    });

    it('throws an error when given an empty string', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: '',
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnException: false });
      expect(result).toBeUndefined();

      expect(error?.message).toContain('cannot be an empty string');
    });

    it('resolves an absolute path as relative inside the workspace root', async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!'); export default {};`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        ssr: true,
        server: '/file.mjs',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
