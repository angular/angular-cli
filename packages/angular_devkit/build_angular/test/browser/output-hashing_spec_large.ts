/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import {
  browserBuild,
  createArchitect,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../utils';

describe('Browser Builder output hashing', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('updates hash as content changes', async () => {
    const OUTPUT_RE = /(main|styles|lazy\.module)\.([a-z0-9]+)\.(chunk|bundle)\.(js|css)$/;

    function generateFileHashMap(): Map<string, string> {
      const hashes = new Map<string, string>();

      host
        .scopedSync()
        .list(normalize('./dist'))
        .forEach(name => {
          const matches = name.match(OUTPUT_RE);
          if (matches) {
            const [, module, hash] = matches;
            hashes.set(module, hash);
          }
        });

      return hashes;
    }

    function validateHashes(
      oldHashes: Map<string, string>,
      newHashes: Map<string, string>,
      shouldChange: Array<string>,
    ): void {
      newHashes.forEach((hash, module) => {
        if (hash == oldHashes.get(module)) {
          if (shouldChange.includes(module)) {
            throw new Error(
              `Module "${module}" did not change hash (${hash}), but was expected to.`,
            );
          }
        } else if (!shouldChange.includes(module)) {
          throw new Error(`Module "${module}" changed hash (${hash}), but was not expected to.`);
        }
      });
    }

    let oldHashes: Map<string, string>;
    let newHashes: Map<string, string>;

    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleFnImport);

    const overrides = { outputHashing: 'all', extractCss: true };

    // We must do several builds instead of a single one in watch mode, so that the output
    // path is deleted on each run and only contains the most recent files.
    await browserBuild(architect, host, target, overrides);

    // Save the current hashes.
    oldHashes = generateFileHashMap();
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleFnImport);

    await browserBuild(architect, host, target, overrides);
    newHashes = generateFileHashMap();
    validateHashes(oldHashes, newHashes, []);
    oldHashes = newHashes;
    host.writeMultipleFiles({ 'src/styles.css': 'body { background: blue; }' });

    // Style hash should change.
    await browserBuild(architect, host, target, overrides);
    newHashes = generateFileHashMap();
    validateHashes(oldHashes, newHashes, ['styles']);
    oldHashes = newHashes;
    host.writeMultipleFiles({ 'src/app/app.component.css': 'h1 { margin: 10px; }' });

    // Main hash should change, since inline styles go in the main bundle.
    await browserBuild(architect, host, target, overrides);
    newHashes = generateFileHashMap();
    validateHashes(oldHashes, newHashes, ['main']);
    oldHashes = newHashes;
    host.appendToFile('src/app/lazy/lazy.module.ts', `console.log(1);`);

    // Lazy loaded bundle should change, and so should inline.
    await browserBuild(architect, host, target, overrides);
    newHashes = generateFileHashMap();
    validateHashes(oldHashes, newHashes, ['lazy.module']);
    oldHashes = newHashes;
    host.appendToFile('src/main.ts', '');

    // Nothing should have changed.
    await browserBuild(architect, host, target, overrides);
    newHashes = generateFileHashMap();
    validateHashes(oldHashes, newHashes, []);
  });

  it('supports options', async () => {
    host.writeMultipleFiles({ 'src/styles.css': `h1 { background: url('./spectrum.png')}` });
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleFnImport);

    // We must do several builds instead of a single one in watch mode, so that the output
    // path is deleted on each run and only contains the most recent files.
    // 'all' should hash everything.
    await browserBuild(architect, host, target, { outputHashing: 'all', extractCss: true });

    expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeTruthy();

    // 'none' should hash nothing.
    await browserBuild(architect, host, target, { outputHashing: 'none', extractCss: true });

    expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeFalsy();

    // 'media' should hash css resources only.
    await browserBuild(architect, host, target, { outputHashing: 'media', extractCss: true });

    expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeTruthy();

    // 'bundles' should hash bundles only.
    await browserBuild(architect, host, target, { outputHashing: 'bundles', extractCss: true });
    expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeTruthy();
    expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeFalsy();
  });

  it('does not hash non injected styles', async () => {
    const overrides = {
      outputHashing: 'all',
      extractCss: true,
      styles: [{ input: 'src/styles.css', inject: false }],
    };

    await browserBuild(architect, host, target, overrides);

    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.js.map/)).toBeFalsy();
    expect(host.scopedSync().exists(normalize('dist/styles.css'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/styles.css.map'))).toBe(true);
  });

  it('does not hash non injected styles when optimization is enabled', async () => {
    const overrides = {
      outputHashing: 'all',
      extractCss: true,
      optimization: true,
      styles: [{ input: 'src/styles.css', inject: false }],
    };

    await browserBuild(architect, host, target, overrides);
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.js/)).toBeFalsy();
    expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.js.map/)).toBeFalsy();
    expect(host.scopedSync().exists(normalize('dist/styles.css'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/styles.css.map'))).toBe(true);
  });
});
