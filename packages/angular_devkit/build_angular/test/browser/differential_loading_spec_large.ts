/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect/src/index';
import { PathFragment } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../utils';

describe('Browser Builder with differential loading', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    // to trigger differential loading we need an non ever green browser
    host.writeMultipleFiles({
      browserslist: 'IE 10',
    });

    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it('emits all the neccessary files', async () => {
    const { files } = await browserBuild(architect, host, target);

    const expectedOutputs = [
      'favicon.ico',
      'index.html',

      'main-es2015.js',
      'main-es2015.js.map',
      'main-es5.js',
      'main-es5.js.map',

      'polyfills-es2015.js',
      'polyfills-es2015.js.map',
      'polyfills-es5.js',
      'polyfills-es5.js.map',

      'runtime-es2015.js',
      'runtime-es2015.js.map',
      'runtime-es5.js',
      'runtime-es5.js.map',

      'styles-es2015.js',
      'styles-es2015.js.map',
      'styles-es5.js',
      'styles-es5.js.map',

      'vendor-es2015.js',
      'vendor-es2015.js.map',
      'vendor-es5.js',
      'vendor-es5.js.map',
    ] as PathFragment[];

    expect(Object.keys(files)).toEqual(jasmine.arrayWithExactContents(expectedOutputs));
  });

  it('deactivates differential loading for watch mode', async () => {
    const { files } = await browserBuild(architect, host, target, { watch: true });

    const expectedOutputs = [
      'favicon.ico',
      'index.html',

      'main.js',
      'main.js.map',

      'polyfills.js',
      'polyfills.js.map',

      'runtime.js',
      'runtime.js.map',

      'styles.js',
      'styles.js.map',

      'vendor.js',
      'vendor.js.map',
    ] as PathFragment[];

    expect(Object.keys(files)).toEqual(jasmine.arrayWithExactContents(expectedOutputs));
  });

  it('emits the right ES formats', async () => {
    if (!process.env['NG_BUILD_FULL_DIFFERENTIAL']) {
      // The test fails depending on the order of previously executed tests
      // The wrong data is being read from the filesystem.
      pending('Incredibly flaky outside full build differential loading');
    }
    const { files } = await browserBuild(architect, host, target, { optimization: true });
    expect(await files['main-es5.js']).not.toContain('class');
    expect(await files['main-es2015.js']).toContain('class');
  });

  it('uses the right zone.js variant', async () => {
    const { files } = await browserBuild(architect, host, target, { optimization: false });
    expect(await files['polyfills-es5.js']).toContain('zone.js/dist/zone-legacy');
    expect(await files['polyfills-es5.js']).toContain('registerElementPatch');
    expect(await files['polyfills-es5.js']).toContain('zone.js/dist/zone-evergreen');
    expect(await files['polyfills-es2015.js']).toContain('zone.js/dist/zone-evergreen');
    expect(await files['polyfills-es2015.js']).not.toContain('zone.js/dist/zone-legacy');
    expect(await files['polyfills-es2015.js']).not.toContain('registerElementPatch');
  });

  it('adds `type="module"` when differential loading is needed', async () => {
    host.writeMultipleFiles({
      browserslist: `
        last 1 chrome version
        IE 9
      `,
    });

    const { files } = await browserBuild(architect, host, target, { watch: true });
    expect(await files['index.html']).toContain(
      '<script src="runtime.js" type="module"></script>' +
        '<script src="polyfills.js" type="module"></script>' +
        '<script src="styles.js" type="module"></script>' +
        '<script src="vendor.js" type="module"></script>' +
        '<script src="main.js" type="module"></script>',
    );
  });
});
