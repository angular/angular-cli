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

// This feature is currently hidden behind a flag
xdescribe('Browser Builder with differential loading', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it('emits all the neccessary files', async () => {
    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es2015"',
    );

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

    expect(Object.keys(files))
      .toEqual(jasmine.arrayWithExactContents(expectedOutputs));
  });

  it('emits the right ES formats', async () => {
    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es2015"',
    );

    const { files } = await browserBuild(architect, host, target, { optimization: true });
    expect(await files['main-es5.js']).not.toContain('class');
    expect(await files['main-es2015.js']).toContain('class');
  });

});
