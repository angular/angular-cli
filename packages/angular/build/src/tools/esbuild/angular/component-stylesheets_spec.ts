/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeHash } from '../../../utils/hash';
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
    await rm(tempRoot, { force: true, recursive: true });
  });

  it('uses the component filename instead of angular:styles/component virtual URI in bundleInline error locations', async () => {
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
      'css',
      true,
    );

    const componentFile = join(tempRoot, 'src', 'lib', 'lib.component.ts');

    try {
      const result = await bundler.bundleInline(
        '.icon { background: url("./missing.png"); }',
        componentFile,
      );

      assert(result.errors, 'Expected bundleInline to report a resolution error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].location?.file).toBe(componentFile);
      expect(result.referencedFiles).toContain(componentFile);
    } finally {
      await bundler.dispose();
    }
  });

  it('uses the component filename instead of angular:styles/component virtual URI in bundleInline warning locations', async () => {
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
      'css',
      false,
    );

    const componentFile = join(tempRoot, 'src', 'lib', 'lib.component.ts');

    try {
      const result = await bundler.bundleInline('.box { color: red', componentFile);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].location?.file).toBe(componentFile);
    } finally {
      await bundler.dispose();
    }
  });
});
