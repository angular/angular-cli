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
  describe('Option: "statsJson"', () => {
    it('generates only browser stats file containing valid metafile data when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser-stats.json').toExist();
      harness.expectFile('dist/server-stats.json').toNotExist();

      const browserStats = JSON.parse(harness.readFile('dist/browser-stats.json'));
      expect(browserStats.inputs).toBeDefined();
      expect(browserStats.outputs).toBeDefined();
      expect(Object.keys(browserStats.outputs).length).toBeGreaterThan(0);
    });

    it('does not generate stats files when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser-stats.json').toNotExist();
      harness.expectFile('dist/server-stats.json').toNotExist();
    });

    it('does not generate stats files when not set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/browser-stats.json').toNotExist();
      harness.expectFile('dist/server-stats.json').toNotExist();
    });

    describe('server build', () => {
      beforeEach(async () => {
        await harness.modifyFile('src/tsconfig.app.json', (content) => {
          const tsConfig = JSON.parse(content);
          tsConfig.files ??= [];
          tsConfig.files.push('main.server.ts');

          return JSON.stringify(tsConfig);
        });
      });

      it('generates separated browser and server stats files for an SSR build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/server-stats.json').toExist();

        const browserStats = JSON.parse(harness.readFile('dist/browser-stats.json'));
        const serverStats = JSON.parse(harness.readFile('dist/server-stats.json'));

        const browserPaths = new Set(Object.keys(browserStats.outputs));
        const serverPaths = new Set(Object.keys(serverStats.outputs));

        expect(serverPaths.size).toBeGreaterThan(0);
        expect(browserPaths.size).toBeGreaterThan(0);

        for (const path of serverPaths) {
          expect(browserPaths.has(path))
            .withContext(`Server output '${path}' should not appear in browser-stats.json`)
            .toBeFalse();
        }

        for (const path of browserPaths) {
          expect(serverPaths.has(path))
            .withContext(`Browser output '${path}' should not appear in server-stats.json`)
            .toBeFalse();
        }
      });
    });
  });
});
