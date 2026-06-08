/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { OutputMode } from '../../schema';
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

  describe('Option: "outputMode"', () => {
    it(`should not emit 'server' directory when OutputMode is Static`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputMode: OutputMode.Static,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts' },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectDirectory('dist/server').toNotExist();
    });

    it(`should emit 'server' directory when OutputMode is Server`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputMode: OutputMode.Server,
        server: 'src/main.server.ts',
        ssr: { entry: 'src/server.ts' },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/server/main.server.mjs').toExist();
      harness.expectFile('dist/server/server.mjs').toExist();
    });
  });
});
