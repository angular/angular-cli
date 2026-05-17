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
    describe('browser-only build', () => {
      it('generates only browser stats files when statsJson is true', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/browser-initial-stats.json').toExist();
        harness.expectFile('dist/server-stats.json').toNotExist();
        harness.expectFile('dist/server-initial-stats.json').toNotExist();
      });

      it('does not generate any stats files when statsJson is false', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: false,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toNotExist();
        harness.expectFile('dist/browser-initial-stats.json').toNotExist();
        harness.expectFile('dist/server-stats.json').toNotExist();
        harness.expectFile('dist/server-initial-stats.json').toNotExist();
      });

      it('does not generate legacy stats.json when statsJson is true', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile('dist/stats.json').toNotExist();
      });

      it('browser-stats.json contains valid esbuild metafile with inputs and outputs', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        const content = harness.readFile('dist/browser-stats.json');
        const parsed = JSON.parse(content) as { inputs: unknown; outputs: unknown };
        expect(parsed.inputs).toBeDefined();
        expect(parsed.outputs).toBeDefined();
      });

      it('browser-initial-stats.json contains only a subset of browser-stats.json outputs', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        const allStats = JSON.parse(harness.readFile('dist/browser-stats.json')) as {
          outputs: Record<string, unknown>;
        };
        const initialStats = JSON.parse(harness.readFile('dist/browser-initial-stats.json')) as {
          outputs: Record<string, unknown>;
        };

        const allOutputCount = Object.keys(allStats.outputs).length;
        const initialOutputCount = Object.keys(initialStats.outputs).length;

        expect(allOutputCount).toBeGreaterThanOrEqual(initialOutputCount);
        for (const path of Object.keys(initialStats.outputs)) {
          expect(allStats.outputs[path]).toBeDefined();
        }
      });
    });

    describe('SSR build', () => {
      beforeEach(async () => {
        await harness.modifyFile('src/tsconfig.app.json', (content) => {
          const tsConfig = JSON.parse(content) as { files?: string[] };
          tsConfig.files ??= [];
          tsConfig.files.push('main.server.ts');

          return JSON.stringify(tsConfig);
        });
      });

      it('generates all four stats files for an SSR build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/browser-initial-stats.json').toExist();
        harness.expectFile('dist/server-stats.json').toExist();
        harness.expectFile('dist/server-initial-stats.json').toExist();
      });

      it('server-stats.json has non-empty outputs for an SSR build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        const content = harness.readFile('dist/server-stats.json');
        const parsed = JSON.parse(content) as { outputs: Record<string, unknown> };
        expect(Object.keys(parsed.outputs).length).toBeGreaterThan(0);
      });

      it('browser-stats.json does not contain server output paths for an SSR build', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          ssr: true,
          statsJson: true,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        const browserStats = JSON.parse(harness.readFile('dist/browser-stats.json')) as {
          outputs: Record<string, unknown>;
        };
        const serverStats = JSON.parse(harness.readFile('dist/server-stats.json')) as {
          outputs: Record<string, unknown>;
        };

        const browserPaths = new Set(Object.keys(browserStats.outputs));
        for (const path of Object.keys(serverStats.outputs)) {
          expect(browserPaths.has(path))
            .withContext(`Server output '${path}' should not appear in browser-stats.json`)
            .toBeFalse();
        }
      });
    });
  });
});
