/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeHash } from '../../../utils/hash';
import { BundlerContext } from '../bundler-context';
import type { BundleStylesheetOptions } from '../stylesheets/bundle-options';
import { ComponentStylesheetBundler } from './component-stylesheets';

describe('ComponentStylesheetBundler', () => {
  let tempRoot: string;

  beforeAll(async () => {
    await initializeHash();
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-component-stylesheets-'));
  });

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  function createOptions(
    overrides: Partial<BundleStylesheetOptions> = {},
  ): BundleStylesheetOptions {
    return {
      workspaceRoot: tempRoot,
      optimization: false,
      inlineFonts: false,
      sourcemap: false,
      outputNames: { bundles: '[name]', media: 'media/[name]' },
      target: ['es2022'],
      cacheOptions: {
        enabled: false,
        path: join(tempRoot, '.cache'),
        basePath: tempRoot,
      },
      ...overrides,
    };
  }

  it('should deduplicate identical inline styles across components in the same directory when sourcemaps are disabled', async () => {
    const bundler = new ComponentStylesheetBundler(
      createOptions({ sourcemap: false }),
      'css',
      true,
    );
    const bundleSpy = spyOn(BundlerContext.prototype, 'bundle').and.callThrough();

    try {
      const compA = join(tempRoot, 'src/a.component.ts');
      const compB = join(tempRoot, 'src/b.component.ts');
      const inlineCss = ':host { color: red; }';

      const resultA = await bundler.bundleInline(inlineCss, compA, 'css');
      const resultB = await bundler.bundleInline(inlineCss, compB, 'css');

      expect(resultA.contents).toContain('color: red');
      expect(resultB.contents).toEqual(resultA.contents);
      // Both calls share the same BundlerContext instance in #inlineContexts
      expect(bundleSpy).toHaveBeenCalledTimes(2);
      expect(bundleSpy.calls.first().object).toBe(bundleSpy.calls.mostRecent().object);
    } finally {
      await bundler.dispose();
    }
  });

  it('should not dispose inline BundlerContext on component file invalidation and should invalidate watched dependencies', async () => {
    const sharedCssPath = join(tempRoot, 'shared.css');
    const compPath = join(tempRoot, 'comp.component.ts');
    await writeFile(sharedCssPath, '.shared { color: blue; }');

    const bundler = new ComponentStylesheetBundler(
      createOptions({ sourcemap: false }),
      'css',
      true,
    );
    const disposeSpy = spyOn(BundlerContext.prototype, 'dispose').and.callThrough();
    const invalidateSpy = spyOn(BundlerContext.prototype, 'invalidate').and.callThrough();

    try {
      const inlineCss = `@import "./shared.css"; :host { display: block; }`;

      const initialResult = await bundler.bundleInline(inlineCss, compPath, 'css');
      expect(initialResult.contents).toContain('color: blue');

      // Invalidating the component .ts file should delegate to bundler.invalidate() without disposing the BundlerContext
      bundler.invalidate([compPath]);
      expect(disposeSpy).not.toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledTimes(1);

      const rebuildUnchanged = await bundler.bundleInline(inlineCss, compPath, 'css');
      expect(rebuildUnchanged.contents).toContain('color: blue');

      // Modifying and invalidating a watched dependency (@import "./shared.css") should invalidate the cached bundle result
      await writeFile(sharedCssPath, '.shared { color: green; }');
      bundler.invalidate([sharedCssPath]);
      expect(disposeSpy).not.toHaveBeenCalled();

      const rebuildAfterDepChange = await bundler.bundleInline(inlineCss, compPath, 'css');
      expect(rebuildAfterDepChange.contents).toContain('color: green');
    } finally {
      await bundler.dispose();
    }

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
