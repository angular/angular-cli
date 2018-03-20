/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { PathFragment, join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


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
    { input: 'src/input-script.js' },
    { input: 'src/zinput-script.js' },
    { input: 'src/finput-script.js' },
    { input: 'src/uinput-script.js' },
    { input: 'src/binput-script.js' },
    { input: 'src/ainput-script.js' },
    { input: 'src/cinput-script.js' },
    { input: 'src/lazy-script.js', lazy: true },
    { input: 'src/pre-rename-script.js', output: 'renamed-script' },
    { input: 'src/pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true },
  ];

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

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
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('uglifies, uses sourcemaps, and adds hashes', (done) => {
    host.writeMultipleFiles(scripts);

    const overrides = {
      optimizationLevel: 1,
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
    ).subscribe(undefined, done.fail, done);
  }, 45000);

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
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
