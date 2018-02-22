/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { PathFragment, join, normalize, virtualFs } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Browser Builder scripts array', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
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
    { input: 'input-script.js' },
    { input: 'zinput-script.js' },
    { input: 'finput-script.js' },
    { input: 'uinput-script.js' },
    { input: 'binput-script.js' },
    { input: 'ainput-script.js' },
    { input: 'cinput-script.js' },
    { input: 'lazy-script.js', lazy: true },
    { input: 'pre-rename-script.js', output: 'renamed-script' },
    { input: 'pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true },
  ];

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    const matches: { [path: string]: string } = {
      './dist/scripts.bundle.js': 'input-script',
      './dist/lazy-script.bundle.js': 'lazy-script',
      './dist/renamed-script.bundle.js': 'pre-rename-script',
      './dist/renamed-lazy-script.bundle.js': 'pre-rename-lazy-script',
      './dist/main.bundle.js': 'input-script',
      './dist/index.html': '<script type="text/javascript" src="inline.bundle.js"></script>'
        + '<script type="text/javascript" src="polyfills.bundle.js"></script>'
        + '<script type="text/javascript" src="scripts.bundle.js"></script>'
        + '<script type="text/javascript" src="renamed-script.bundle.js"></script>'
        + '<script type="text/javascript" src="vendor.bundle.js"></script>'
        + '<script type="text/javascript" src="main.bundle.js"></script>',
    };

    host.writeMultipleFiles(scripts);
    host.appendToFile('src/main.ts', '\nimport \'./input-script.js\';');

    // Remove styles so we don't have to account for them in the index.html order check.
    const overrides = {
      styles: [],
      scripts: getScriptsOption(),
    };

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => Object.keys(matches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
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

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const scriptsBundle = host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.bundle\.js/);
        expect(scriptsBundle).toBeTruthy();
        const fileName = join(outputPath, scriptsBundle as PathFragment);
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
        expect(content).toMatch('var number=2;');
        expect(host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.bundle\.js\.map/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /renamed-script\.[0-9a-f]{20}\.bundle\.js/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /renamed-script\.[0-9a-f]{20}\.bundle\.js\.map/))
          .toBeTruthy();
        expect(host.fileMatchExists(outputPath, /scripts\.[0-9a-f]{20}\.bundle\.js/)).toBeTruthy();
        expect(host.asSync().exists(normalize('dist/lazy-script.bundle.js'))).toBe(true);
        expect(host.asSync().exists(normalize('dist/lazy-script.bundle.js.map'))).toBe(true);
        expect(host.asSync().exists(normalize('dist/renamed-lazy-script.bundle.js'))).toBe(true);
        expect(host.asSync().exists(normalize('dist/renamed-lazy-script.bundle.js.map')))
          .toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 45000);

  it('preserves script order', (done) => {
    host.writeMultipleFiles(scripts);

    const overrides = { scripts: getScriptsOption() };

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
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
        const fileName = './dist/scripts.bundle.js';
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
        expect(content).toMatch(re);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
