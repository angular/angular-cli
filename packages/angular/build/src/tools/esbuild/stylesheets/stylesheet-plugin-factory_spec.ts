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
import { initializeHash } from '../../../utils/hash';
import { ComponentStylesheetBundler } from '../angular/component-stylesheets';
import { resetSassWorkerPoolCaches, shutdownSassWorkerPool } from './sass-language';
import { StylesheetLanguage, StylesheetPluginFactory } from './stylesheet-plugin-factory';

describe('StylesheetPluginFactory', () => {
  it('sets resolveDir and preserves semicolons in filename for inline component styles', async () => {
    const filename = '/workspace/src/dir;with;semicolons/app.component.ts';
    const entryPath = `scss;abc123;${filename}`;
    let receivedFile: string | undefined;
    let receivedFormat: string | undefined;

    const language: StylesheetLanguage = {
      name: 'test-scss',
      componentFilter: /^scss;/,
      fileFilter: /\.scss$/,
      process(data, file, format) {
        receivedFile = file;
        receivedFormat = format;

        return {
          contents: data,
          loader: 'css',
        };
      },
    };

    const factory = new StylesheetPluginFactory({
      sourcemap: false,
      inlineComponentData: {
        [entryPath]: '.box { color: red; }',
      },
    });

    const plugin = factory.create(language);
    let componentLoadCallback:
      | ((
          args: OnLoadArgs,
        ) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>)
      | undefined;

    const buildStub = {
      onStart: () => {},
      onLoad: (
        options: { filter: RegExp; namespace?: string },
        callback: (
          args: OnLoadArgs,
        ) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>,
      ) => {
        if (options.namespace === 'angular:styles/component') {
          componentLoadCallback = callback;
        }
      },
    } as unknown as PluginBuild;

    await plugin.setup(buildStub);
    assert(componentLoadCallback, 'Expected onLoad callback for angular:styles/component');

    const result = await componentLoadCallback({
      path: entryPath,
      namespace: 'angular:styles/component',
      suffix: '',
      pluginData: undefined,
      with: {},
    });

    expect(receivedFormat).toBe('scss');
    expect(receivedFile).toBe(filename);
    expect(result?.resolveDir).toBe('/workspace/src/dir;with;semicolons');
  });

  describe('inline SCSS component stylesheet bundling', () => {
    let tempRoot: string;

    beforeAll(async () => {
      await initializeHash();
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-inline-style-test-'));
    });

    afterAll(async () => {
      shutdownSassWorkerPool();
      await rm(tempRoot, { force: true, recursive: true });
    });

    beforeEach(() => {
      resetSassWorkerPoolCaches();
    });

    it('resolves relative url() assets in inline SCSS when component path contains semicolons', async () => {
      const componentDir = join(tempRoot, 'cmp;dir');
      await mkdir(componentDir, { recursive: true });
      await writeFile(join(componentDir, 'asset.svg'), '<svg></svg>');

      const bundler = new ComponentStylesheetBundler(
        {
          workspaceRoot: tempRoot,
          optimization: false,
          inlineFonts: false,
          sourcemap: false,
          outputNames: { bundles: '[name]', media: 'media/[name]' },
          target: ['es2022'],
          cacheOptions: { enabled: false, path: '', basePath: tempRoot },
        },
        'scss',
        false,
      );

      try {
        const result = await bundler.bundleInline(
          '$icon: "./asset.svg"; .icon { background: url($icon); }',
          join(componentDir, 'app.component.ts'),
          'scss',
        );

        assert(!result.errors, 'Expected inline SCSS bundling to succeed without errors');
        expect(result.contents).toContain('asset.svg');
        expect(result.outputFiles.some((f) => f.path.endsWith('asset.svg'))).toBeTrue();
      } finally {
        await bundler.dispose();
      }
    });
  });
});
