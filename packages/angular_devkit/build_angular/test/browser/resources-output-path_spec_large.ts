/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder styles resources output path', () => {
  const stylesBundle = 'dist/styles.css';
  const mainBundle = 'dist/main.js';

  const imgSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
    </svg>
  `;

  function writeFiles() {
    // Use a large image for the relative ref so it cannot be inlined.
    host.copyFile('src/spectrum.png', './src/assets/global-img-relative.png');
    host.copyFile('src/spectrum.png', './src/assets/component-img-relative.png');
    host.writeMultipleFiles({
      'src/styles.css': `
          h1 { background: url('/assets/global-img-absolute.svg'); }
          h2 { background: url('./assets/global-img-relative.png'); }
        `,
      'src/app/app.component.css': `
          h3 { background: url('/assets/component-img-absolute.svg'); }
          h4 { background: url('../assets/component-img-relative.png'); }
        `,
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg,
    });
  }

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it(`supports resourcesOutputPath in resource urls`, (done) => {
    writeFiles();
    // Check base paths are correctly generated.
    const overrides = {
      aot: true,
      extractCss: true,
      resourcesOutputPath: 'out-assets',
    };

    runTargetSpec(host, browserTargetSpec, overrides, undefined, undefined).pipe(
      tap(() => {
        const styles = virtualFs.fileBufferToString(
          host.scopedSync().read(normalize(stylesBundle)),
        );

        const main = virtualFs.fileBufferToString(host.scopedSync().read(normalize(mainBundle)));
        expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
        expect(styles).toContain(`url('out-assets/global-img-relative.png')`);
        expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
        expect(main).toContain(`url('out-assets/component-img-relative.png')`);

        expect(host.scopedSync()
          .exists(normalize('dist/assets/global-img-absolute.svg'))).toBe(true);
        expect(host.scopedSync()
          .exists(normalize('dist/out-assets/global-img-relative.png'))).toBe(true);
        expect(host.scopedSync()
          .exists(normalize('dist/assets/component-img-absolute.svg'))).toBe(true);
        expect(host.scopedSync()
          .exists(normalize('dist/out-assets/component-img-relative.png'))).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it(`supports blank resourcesOutputPath`, (done) => {
    writeFiles();

    // Check base paths are correctly generated.
    const overrides = { aot: true, extractCss: true };
    runTargetSpec(host, browserTargetSpec, overrides, undefined, undefined).pipe(
      tap(() => {
        const styles = virtualFs.fileBufferToString(
          host.scopedSync().read(normalize(stylesBundle)),
        );

        const main = virtualFs.fileBufferToString(host.scopedSync().read(normalize(mainBundle)));
        expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
        expect(styles).toContain(`url('global-img-relative.png')`);
        expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
        expect(main).toContain(`url('component-img-relative.png')`);
        expect(host.scopedSync().exists(normalize('dist/assets/global-img-absolute.svg')))
          .toBe(true);
        expect(host.scopedSync().exists(normalize('dist/global-img-relative.png')))
          .toBe(true);
        expect(host.scopedSync().exists(normalize('dist/assets/component-img-absolute.svg')))
          .toBe(true);
        expect(host.scopedSync().exists(normalize('dist/component-img-relative.png')))
          .toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

});
