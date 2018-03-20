/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';
import { lazyModuleFiles, lazyModuleImport } from './lazy-module_spec_large';


describe('Browser Builder output hashing', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('updates hash as content changes', (done) => {
    const OUTPUT_RE = /(main|styles|lazy\.module)\.([a-z0-9]+)\.(chunk|bundle)\.(js|css)$/;

    function generateFileHashMap(): Map<string, string> {
      const hashes = new Map<string, string>();

      host.scopedSync().list(normalize('./dist')).forEach(name => {
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
              `Module "${module}" did not change hash (${hash}), but was expected to.`);
          }
        } else if (!shouldChange.includes(module)) {
          throw new Error(`Module "${module}" changed hash (${hash}), but was not expected to.`);
        }
      });
    }

    let oldHashes: Map<string, string>;
    let newHashes: Map<string, string>;

    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleImport);

    const overrides = { outputHashing: 'all', extractCss: true };

    // We must do several builds instead of a single one in watch mode, so that the output
    // path is deleted on each run and only contains the most recent files.
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(() => {
        // Save the current hashes.
        oldHashes = generateFileHashMap();
        host.writeMultipleFiles(lazyModuleFiles);
        host.writeMultipleFiles(lazyModuleImport);
      }),
      // Lazy chunk hash should have changed without modifying main bundle.
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides)),
      tap(() => {
        newHashes = generateFileHashMap();
        validateHashes(oldHashes, newHashes, []);
        oldHashes = newHashes;
        host.writeMultipleFiles({ 'src/styles.css': 'body { background: blue; }' });
      }),
      // Style hash should change.
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides)),
      tap(() => {
        newHashes = generateFileHashMap();
        validateHashes(oldHashes, newHashes, ['styles']);
        oldHashes = newHashes;
        host.writeMultipleFiles({ 'src/app/app.component.css': 'h1 { margin: 10px; }' });
      }),
      // Main hash should change, since inline styles go in the main bundle.
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides)),
      tap(() => {
        newHashes = generateFileHashMap();
        validateHashes(oldHashes, newHashes, ['main']);
        oldHashes = newHashes;
        host.appendToFile('src/app/lazy/lazy.module.ts', `console.log(1);`);
      }),
      // Lazy loaded bundle should change, and so should inline.
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides)),
      tap(() => {
        newHashes = generateFileHashMap();
        validateHashes(oldHashes, newHashes, ['lazy.module']);
        oldHashes = newHashes;
        host.appendToFile('src/main.ts', '');
      }),
      // Nothing should have changed.
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides)),
      tap(() => {
        newHashes = generateFileHashMap();
        validateHashes(oldHashes, newHashes, []);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  it('supports options', (done) => {
    host.writeMultipleFiles({ 'src/styles.css': `h1 { background: url('./spectrum.png')}` });
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleImport);

    // We must do several builds instead of a single one in watch mode, so that the output
    // path is deleted on each run and only contains the most recent files.
    // 'all' should hash everything.
    runTargetSpec(host, browserTargetSpec, { outputHashing: 'all', extractCss: true }).pipe(
      tap(() => {
        expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeTruthy();
      }),
      // 'none' should hash nothing.
      concatMap(() => runTargetSpec(host, browserTargetSpec,
        { outputHashing: 'none', extractCss: true })),
      tap(() => {
        expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeFalsy();
      }),
      // 'media' should hash css resources only.
      concatMap(() => runTargetSpec(host, browserTargetSpec,
        { outputHashing: 'media', extractCss: true })),
      tap(() => {
        expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeFalsy();
        expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeTruthy();
      }),
      // 'bundles' should hash bundles only.
      concatMap(() => runTargetSpec(host, browserTargetSpec,
        { outputHashing: 'bundles', extractCss: true })),
      tap(() => {
        expect(host.fileMatchExists('dist', /runtime\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /main\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /polyfills\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /vendor\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /styles\.[0-9a-f]{20}\.css/)).toBeTruthy();
        expect(host.fileMatchExists('dist', /spectrum\.[0-9a-f]{20}\.png/)).toBeFalsy();
      }),
    ).subscribe(undefined, done.fail, done);
  }, 60000);
});
