/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { setTimeout } from 'node:timers/promises';
import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

const REBUILD_PATH = '__ng_rebuild';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "manualRebuild"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    it('only rebuilds file changes when a rebuild is requested', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
      });

      let baseUrl = '';
      let rebuildResponse: Promise<Response> | undefined;

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          baseUrl = result?.baseUrl as string;

          // Nothing pending so a request should not rebuild
          const noChangesResponse = await fetch(new URL(REBUILD_PATH, baseUrl), {
            method: 'POST',
          });
          expect(noChangesResponse.status).toBe(200);
          expect(await noChangesResponse.json()).toEqual({ status: 'no-changes' });

          await harness.modifyFile(
            'src/main.ts',
            (content) => content + 'console.log("abcd1234");',
          );

          // Give the file watcher enough time to detect the change. No rebuild should occur.
          await setTimeout(1500);
          const before = await fetch(new URL('main.js', baseUrl));
          expect(await before.text()).not.toContain('abcd1234');

          // Request a rebuild. The response is sent once the rebuild completes.
          rebuildResponse = fetch(new URL(REBUILD_PATH, baseUrl), { method: 'POST' });
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();

          const response = await rebuildResponse;
          expect(response?.status).toBe(200);
          expect(await response?.json()).toEqual({ status: 'success' });

          const after = await fetch(new URL('main.js', baseUrl));
          expect(await after.text()).toContain('abcd1234');
        },
      ]);
    });

    it('rejects non-POST and cross-origin rebuild requests', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          const url = new URL(REBUILD_PATH, result?.baseUrl as string);

          const getResponse = await fetch(url);
          expect(getResponse.status).toBe(405);

          const crossOriginResponse = await fetch(url, {
            method: 'POST',
            headers: { origin: 'http://example.com' },
          });
          expect(crossOriginResponse.status).toBe(403);
        },
      ]);
    });
  });
});
