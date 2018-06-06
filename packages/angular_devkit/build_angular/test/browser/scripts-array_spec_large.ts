/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { PathFragment, join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host } from '../utils';


describe('Browser Builder scripts array', () => {

  const outputPath = normalize('dist');
  const scripts: { [path: string]: string } = {
    'src/input-script.js': 'console.log(\'input-script\'); var number = 1+1;',
    'src/zinput-script.js': 'console.log(\'zinput-script\');',
    'src/finput-script.js': 'console.log(\'finput-script\');',
    'src/uinput-script.js': 'console.log(\'uinput-script\');',
    'src/binput-script.js': 'console.log(\'binput-script\');',
    'src/ainput-script.js': 'console.log(\'ainput-script\');',
    'src/cinput-script.js': 'console.log(\'cinput-script\');',
    'src/lazy-script.js': 'console.log(\'lazy-script\');',
    'src/pre-rename-script.js': 'console.log(\'pre-rename-script\');',
    'src/pre-rename-lazy-script.js': 'console.log(\'pre-rename-lazy-script\');',
  };
  const getScriptsOption = () => [
    'src/input-script.js',
    'src/zinput-script.js',
    'src/finput-script.js',
    'src/uinput-script.js',
    'src/binput-script.js',
    'src/ainput-script.js',
    'src/cinput-script.js',
    { input: 'src/lazy-script.js', bundleName: 'lazy-script', lazy: true },
    { input: 'src/pre-rename-script.js', bundleName: 'renamed-script' },
    { input: 'src/pre-rename-lazy-script.js', bundleName: 'renamed-lazy-script', lazy: true },
  ];

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const matches: { [path: string]: string } = {
      './dist/scripts.js': 'input-script',
      './dist/lazy-script.js': 'lazy-script',
      './dist/renamed-script.js': 'pre-rename-script',
      './dist/renamed-lazy-script.js': 'pre-rename-lazy-script',
      './dist/main.js': 'input-script',
      './dist/index.html': '<script type="text/javascript" src="runtime.js"></script>'
        + '<script type="text/javascript" src="polyfills.js"></script>'
        + '<script type="text/javascript" src="scripts.js"></script>'
        + '<script type="text/javascript" src="renamed-script.js"></script>'
        + '<script type="text/javascript" src="vendor.js"></script>'
        + '<script type="text/javascript" src="main.js"></script>',
    };

    host.writeMultipleFiles(scripts);
    host.appendToFile('src/main.ts', '\nimport \'./input-script.js\';');

    // Remove styles so we don't have to account for them in the index.html order check.
    const overrides = {
      styles: [],
      scripts: getScriptsOption(),
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => Object.keys(matches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(matches[fileName]);
      })),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

  it('uglifies, uses sourcemaps, and adds hashes', (done) => {
    host.writeMultipleFiles(scripts);

    const overrides = {
      optimization: true,
      sourceMap: true,
      outputHashing: 'all',
      scripts: getScriptsOption(),
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const scriptsBundle = host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.js/);
        expect(scriptsBundle).toBeTruthy();
        const fileName = join(outputPath, scriptsBundle as PathFragment);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch('var number=2;');
        expect(host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.js\.map/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /renamed-script\.[0-9a-f]{20}\.js/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /renamed-script\.[0-9a-f]{20}\.js\.map/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.js/)).toBeTruthy();
        expect(host.scopedSync().exists(normalize('dist/lazy-script.js'))).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/lazy-script.js.map'))).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/renamed-lazy-script.js'))).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/renamed-lazy-script.js.map')))
          .toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Complex);

  it('preserves script order', (done) => {
    host.writeMultipleFiles(scripts);

    const overrides = { scripts: getScriptsOption() };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const re = new RegExp(
          /.*['"]input-script['"](.|\n|\r)*/.source
          + /['"]zinput-script['"](.|\n|\r)*/.source
          + /['"]finput-script['"](.|\n|\r)*/.source
          + /['"]uinput-script['"](.|\n|\r)*/.source
          + /['"]binput-script['"](.|\n|\r)*/.source
          + /['"]ainput-script['"](.|\n|\r)*/.source
          + /['"]cinput-script['"]/.source,
        );
        const fileName = './dist/scripts.js';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(re);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);
});
