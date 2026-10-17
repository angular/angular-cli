/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "Renamed chunks"', () => {
    beforeEach(async () => {
      setupTarget(harness);

      await harness.writeFile('src/lazy.ts', `export const value = 'first';`);
      await harness.writeFile('src/main.ts', `import('./lazy').then((m) => console.log(m.value));`);
    });

    it('does not serve a lazy chunk that a rebuild renamed', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
      });

      let oldChunk = '';

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();

          const main = await (await fetch(new URL('main.js', `${result?.baseUrl}`))).text();
          oldChunk = main.match(/chunk-[a-zA-Z0-9]+\.js/)?.[0] ?? '';
          expect(oldChunk).not.toBe('');

          // Request the chunk so that Vite transforms and caches it
          const response = await fetch(new URL(oldChunk, `${result?.baseUrl}`));
          expect(response.status).toBe(200);
          expect(await response.text()).toContain('first');

          await harness.modifyFile('src/lazy.ts', (content) => content.replace('first', 'second'));
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();

          const main = await (await fetch(new URL('main.js', `${result?.baseUrl}`))).text();
          expect(main).not.toContain(oldChunk);

          const response = await fetch(new URL(oldChunk, `${result?.baseUrl}`));
          expect(response.status).toBe(404);
        },
      ]);
    });
  });
});
