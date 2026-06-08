/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  beforeEach(async () => {
    await harness.modifyFile('src/tsconfig.app.json', (content) => {
      const tsConfig = JSON.parse(content);
      tsConfig.files ??= [];
      tsConfig.files.push('main.server.ts', 'server.ts');

      return JSON.stringify(tsConfig);
    });

    await harness.writeFile('src/server.ts', `console.log('Hello!');`);
  });

  describe('Option: "ssr"', () => {
    it('uses a provided TypeScript file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts' },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/main.server.mjs').toExist();
      harness.expectFile('dist/server/server.mjs').toExist();
    });

    it('resolves an absolute path as relative inside the workspace root', async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: { entry: '/file.mjs' },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/server/server.mjs').toExist();
    });

    it(`should emit 'server' directory when 'ssr' is 'true'`, async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectDirectory('dist/server').toExist();
    });

    it(`should not emit 'server' directory when 'ssr' is 'false'`, async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectDirectory('dist/server').toNotExist();
    });

    it(`should not emit 'server' directory when 'ssr' is not set`, async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: undefined,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectDirectory('dist/server').toNotExist();
    });
  });
});
