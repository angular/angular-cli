/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OnLoadArgs, OnLoadResult, PluginBuild } from 'esbuild';
import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MemoryLoadResultCache } from '../load-result-cache';
import { CssStylesheetLanguage } from './css-language';
import { StylesheetPluginFactory, type StylesheetPluginOptions } from './stylesheet-plugin-factory';

describe('StylesheetPluginFactory dir-dependency caching', () => {
  let tempRoot: string;
  let pluginPath: string;

  beforeAll(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-stylesheet-plugin-factory-'));
    pluginPath = join(tempRoot, 'dir-dep-plugin.cjs');

    await writeFile(
      pluginPath,
      `
      module.exports = (opts = {}) => ({
        postcssPlugin: 'dir-dep-test-plugin',
        Once(root, { result }) {
          result.messages.push({
            type: 'dir-dependency',
            plugin: 'dir-dep-test-plugin',
            dir: opts.dir,
            glob: opts.glob || '**/*.html',
          });
        },
      });
      module.exports.postcss = true;
      `,
    );
  });

  afterAll(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  async function setupPluginAndGetComponentLoad(
    options: StylesheetPluginOptions,
    cache?: MemoryLoadResultCache,
  ): Promise<(path: string) => Promise<OnLoadResult | null | undefined>> {
    const factory = new StylesheetPluginFactory(options, cache);
    const plugin = factory.create(CssStylesheetLanguage);

    let onStartCallback: (() => Promise<unknown>) | undefined;
    let componentLoadCallback:
      | ((
          args: OnLoadArgs,
        ) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>)
      | undefined;

    const buildStub = {
      onStart(cb: () => Promise<unknown>) {
        onStartCallback = cb;
      },
      onLoad(
        opts: { filter: RegExp; namespace?: string },
        cb: (
          args: OnLoadArgs,
        ) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>,
      ) {
        if (opts.namespace === 'angular:styles/component') {
          componentLoadCallback = cb;
        }
      },
    } as unknown as PluginBuild;

    await plugin.setup(buildStub);
    await onStartCallback?.();
    assert(componentLoadCallback, 'Expected component onLoad callback to be registered');
    const load = componentLoadCallback;

    return (path: string) =>
      Promise.resolve(
        load({
          path,
          namespace: 'angular:styles/component',
          suffix: '',
          pluginData: undefined,
          with: {},
        }),
      );
  }

  it('should resolve watchFiles from PostCSS dir-dependency messages and reuse cached glob results across stylesheets', async () => {
    const scanDir = await mkdtemp(join(tempRoot, 'scan-single-'));
    await mkdir(join(scanDir, 'nested'), { recursive: true });
    const fileA = join(scanDir, 'a.html');
    const fileB = join(scanDir, 'nested', 'b.html');
    await writeFile(fileA, '<div>A</div>');
    await writeFile(fileB, '<div>B</div>');
    await writeFile(join(scanDir, 'ignored.txt'), 'ignore me');

    const comp1Key = `css;1;${join(scanDir, 'comp1.css')}`;
    const comp2Key = `css;2;${join(scanDir, 'comp2.css')}`;

    const loadComponent = await setupPluginAndGetComponentLoad({
      sourcemap: false,
      inlineComponentData: {
        [comp1Key]: '.a { color: red; }',
        [comp2Key]: '.b { color: blue; }',
      },
      postcssConfiguration: {
        configPath: join(tempRoot, 'postcss.config.json'),
        config: {
          plugins: [[pluginPath, { dir: scanDir, glob: '**/*.html' }]],
        },
      },
    });

    const result1 = await loadComponent(comp1Key);
    expect(result1?.watchFiles).toBeDefined();
    expect(result1?.watchFiles).toContain(fileA);
    expect(result1?.watchFiles).toContain(fileB);
    expect(result1?.watchFiles).not.toContain(join(scanDir, 'ignored.txt'));

    // Add a new matching file on disk without starting a new build or invalidating cache.
    const fileC = join(scanDir, 'c.html');
    await writeFile(fileC, '<div>C</div>');

    // Second stylesheet in the same build should reuse the cached glob result without re-scanning.
    const result2 = await loadComponent(comp2Key);
    expect(result2?.watchFiles).toContain(fileA);
    expect(result2?.watchFiles).toContain(fileB);
    expect(result2?.watchFiles).not.toContain(fileC);
  });

  it('should share cached dir-dependency glob results across StylesheetPluginFactory instances sharing a LoadResultCache and invalidate on cache.invalidate', async () => {
    const scanDir = await mkdtemp(join(tempRoot, 'scan-shared-'));
    const fileA = join(scanDir, 'a.html');
    await writeFile(fileA, '<div>A</div>');

    const sharedCache = new MemoryLoadResultCache();
    const postcssConfiguration = {
      configPath: join(tempRoot, 'postcss.config.json'),
      config: {
        plugins: [[pluginPath, { dir: scanDir, glob: '**/*.html' }]] as [
          string,
          Record<string, unknown>,
        ][],
      },
    };

    const comp1Key = `css;1;${join(scanDir, 'comp1.css')}`;
    const loadComp1 = await setupPluginAndGetComponentLoad(
      {
        sourcemap: false,
        inlineComponentData: { [comp1Key]: '.a { color: red; }' },
        postcssConfiguration,
      },
      sharedCache,
    );

    const result1 = await loadComp1(comp1Key);
    expect(result1?.watchFiles).toContain(fileA);

    // Write a new file after the first component was compiled.
    const fileB = join(scanDir, 'b.html');
    await writeFile(fileB, '<div>B</div>');

    // A second StylesheetPluginFactory sharing the same LoadResultCache should reuse the cached glob promise.
    const comp2Key = `css;2;${join(scanDir, 'comp2.css')}`;
    const loadComp2 = await setupPluginAndGetComponentLoad(
      {
        sourcemap: false,
        inlineComponentData: { [comp2Key]: '.b { color: blue; }' },
        postcssConfiguration,
      },
      sharedCache,
    );

    const result2 = await loadComp2(comp2Key);
    expect(result2?.watchFiles).toContain(fileA);
    expect(result2?.watchFiles).not.toContain(fileB);

    // Invalidating the shared LoadResultCache should clear the dir-dependency glob cache.
    sharedCache.invalidate(fileA);

    const comp3Key = `css;3;${join(scanDir, 'comp3.css')}`;
    const loadComp3 = await setupPluginAndGetComponentLoad(
      {
        sourcemap: false,
        inlineComponentData: { [comp3Key]: '.c { color: green; }' },
        postcssConfiguration,
      },
      sharedCache,
    );

    const result3 = await loadComp3(comp3Key);
    expect(result3?.watchFiles).toContain(fileA);
    expect(result3?.watchFiles).toContain(fileB);
  });
});
