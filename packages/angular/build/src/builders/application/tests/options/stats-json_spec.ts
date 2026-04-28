/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/** Minimal subset of an esbuild metafile used by stats assertions. */
interface StatsMetafile {
  inputs: Record<string, unknown>;
  outputs: Record<string, { inputs: Record<string, unknown> }>;
}

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "statsJson"', () => {
    describe('browser-only build', () => {
      beforeEach(() => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
        });
      });

      it('generates browser-stats.json and browser-initial-stats.json', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/browser-initial-stats.json').toExist();
      });

      it('does not generate server stats files when SSR is disabled', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('dist/server-stats.json').toNotExist();
        harness.expectFile('dist/server-initial-stats.json').toNotExist();
      });

      it('does not generate the legacy stats.json file', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('dist/stats.json').toNotExist();
      });

      it('stats files contain valid esbuild metafile structure', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();

        for (const filename of ['dist/browser-stats.json', 'dist/browser-initial-stats.json']) {
          const stats = JSON.parse(harness.readFile(filename)) as StatsMetafile;
          expect(stats.inputs).withContext(`${filename} must have an inputs field`).toBeDefined();
          expect(stats.outputs).withContext(`${filename} must have an outputs field`).toBeDefined();
        }
      });

      it('output paths do not overlap between browser-stats.json and browser-initial-stats.json', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();

        const nonInitialPaths = new Set(
          Object.keys(
            (JSON.parse(harness.readFile('dist/browser-stats.json')) as StatsMetafile).outputs,
          ),
        );
        const initialPaths = Object.keys(
          (JSON.parse(harness.readFile('dist/browser-initial-stats.json')) as StatsMetafile)
            .outputs,
        );

        for (const outputPath of initialPaths) {
          expect(nonInitialPaths.has(outputPath))
            .withContext(`Output '${outputPath}' must not appear in both stats files`)
            .toBeFalse();
        }
      });

      it('inputs in each stats file are only those referenced by included outputs', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();

        for (const filename of ['dist/browser-stats.json', 'dist/browser-initial-stats.json']) {
          const stats = JSON.parse(harness.readFile(filename)) as StatsMetafile;
          const referencedInputs = new Set(
            Object.values(stats.outputs).flatMap((output) => Object.keys(output.inputs)),
          );

          for (const inputPath of Object.keys(stats.inputs)) {
            expect(referencedInputs.has(inputPath))
              .withContext(
                `Input '${inputPath}' in '${filename}' is not referenced by any included output`,
              )
              .toBeTrue();
          }
        }
      });
    });

    describe('when statsJson is false', () => {
      it('does not generate any stats files', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: false,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toNotExist();
        harness.expectFile('dist/browser-initial-stats.json').toNotExist();
        harness.expectFile('dist/stats.json').toNotExist();
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

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          statsJson: true,
          server: 'src/main.server.ts',
          ssr: true,
        });
      });

      it('generates all four stats files', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('dist/browser-stats.json').toExist();
        harness.expectFile('dist/browser-initial-stats.json').toExist();
        harness.expectFile('dist/server-stats.json').toExist();
        harness.expectFile('dist/server-initial-stats.json').toExist();
      });

      it('server stats files contain valid esbuild metafile structure', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();

        for (const filename of ['dist/server-stats.json', 'dist/server-initial-stats.json']) {
          const stats = JSON.parse(harness.readFile(filename)) as StatsMetafile;
          expect(stats.inputs).withContext(`${filename} must have an inputs field`).toBeDefined();
          expect(stats.outputs).withContext(`${filename} must have an outputs field`).toBeDefined();
        }
      });

      it('server output paths do not overlap between server-stats.json and server-initial-stats.json', async () => {
        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();

        const nonInitialPaths = new Set(
          Object.keys(
            (JSON.parse(harness.readFile('dist/server-stats.json')) as StatsMetafile).outputs,
          ),
        );
        const initialPaths = Object.keys(
          (JSON.parse(harness.readFile('dist/server-initial-stats.json')) as StatsMetafile).outputs,
        );

        for (const outputPath of initialPaths) {
          expect(nonInitialPaths.has(outputPath))
            .withContext(`Output '${outputPath}' must not appear in both server stats files`)
            .toBeFalse();
        }
      });
    });
  });
});
