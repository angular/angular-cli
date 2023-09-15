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
        ssr: 'src/server.ts',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/main.server.mjs').toExist();
      harness.expectFile('dist/server.mjs').toExist();
    });

    it('resolves an absolute path as relative inside the workspace root', async () => {
      await harness.writeFile('file.mjs', `console.log('Hello!');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: '/file.mjs',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/server.mjs').toExist();
    });
  });
});
