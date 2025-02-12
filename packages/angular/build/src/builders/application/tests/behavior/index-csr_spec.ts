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
  describe('Behavior: "index.csr.html"', () => {
    beforeEach(async () => {
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts');

        return JSON.stringify(tsConfig);
      });
    });

    it(`should generate 'index.csr.html' instead of 'index.html' when ssr is enabled.`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectDirectory('dist/server').toExist();
      harness.expectFile('dist/browser/index.csr.html').toExist();
      harness.expectFile('dist/browser/index.html').toNotExist();
    });

    it(`should generate 'index.csr.html' instead of 'index.html' when 'output' is 'index.html' and ssr is enabled.`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        index: {
          input: 'src/index.html',
          output: 'index.html',
        },
        server: 'src/main.server.ts',
        ssr: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectDirectory('dist/server').toExist();
      harness.expectFile('dist/browser/index.csr.html').toExist();
      harness.expectFile('dist/browser/index.html').toNotExist();
    });
  });
});
