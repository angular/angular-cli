/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { logging } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder scripts array', () => {
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
    { input: 'src/lazy-script.js', bundleName: 'lazy-script', inject: false },
    { input: 'src/pre-rename-script.js', bundleName: 'renamed-script' },
    { input: 'src/pre-rename-lazy-script.js', bundleName: 'renamed-lazy-script', inject: false },
  ];

  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const matches: Record<string, string> = {
      'scripts.js': 'input-script',
      'lazy-script.js': 'lazy-script',
      'renamed-script.js': 'pre-rename-script',
      'renamed-lazy-script.js': 'pre-rename-lazy-script',
      'main.js': 'input-script',
      'index.html': '<script src="runtime.js" defer></script>'
        + '<script src="polyfills.js" defer></script>'
        + '<script src="scripts.js" defer></script>'
        + '<script src="renamed-script.js" defer></script>'
        + '<script src="vendor.js" defer></script>'
        + '<script src="main.js" defer></script>',
    };

    host.writeMultipleFiles(scripts);
    host.appendToFile('src/main.ts', '\nimport \'./input-script.js\';');

    // Remove styles so we don't have to account for them in the index.html order check.
    const { files } = await browserBuild(architect, host, target, {
      styles: [],
      scripts: getScriptsOption(),
    } as {});

    for (const [fileName, content] of Object.entries(matches)) {
      expect(await files[fileName]).toMatch(content);
    }
  });

  it('works in watch mode with differential loading', async () => {
    const matches: Record<string, string> = {
      'scripts.js': 'input-script',
      'lazy-script.js': 'lazy-script',
      'renamed-script.js': 'pre-rename-script',
      'renamed-lazy-script.js': 'pre-rename-lazy-script',
      'main.js': 'input-script',
      'index.html': '<script src="runtime.js" type="module"></script>'
        + '<script src="polyfills.js" type="module"></script>'
        + '<script src="scripts.js" defer></script>'
        + '<script src="renamed-script.js" defer></script>'
        + '<script src="vendor.js" type="module"></script>'
        + '<script src="main.js" type="module"></script>',
    };

    host.writeMultipleFiles(scripts);
    host.appendToFile('src/main.ts', '\nimport \'./input-script.js\';');

    // Enable differential loading
    host.appendToFile('browserslist', '\nIE 10');

    // Remove styles so we don't have to account for them in the index.html order check.
    const { files } = await browserBuild(architect, host, target, {
      styles: [],
      scripts: getScriptsOption(),
      watch: true,
    } as {});

    for (const [fileName, content] of Object.entries(matches)) {
      expect(await files[fileName]).toMatch(content);
    }
  });

  it('uglifies, uses sourcemaps, and adds hashes', async () => {
    host.writeMultipleFiles(scripts);

    const { files } = await browserBuild(architect, host, target, {
      optimization: true,
      sourceMap: true,
      outputHashing: 'all',
      scripts: getScriptsOption(),
    } as {});

    const fileNames = Object.keys(files);
    const scriptsBundle = fileNames.find(n => /scripts\.[0-9a-f]{20}\.js/.test(n));
    expect(scriptsBundle).toBeTruthy();
    expect(await files[scriptsBundle || '']).toMatch('var number=2;');

    expect(fileNames.some(n => /scripts\.[0-9a-f]{20}\.js\.map/.test(n))).toBeTruthy();
    expect(fileNames.some(n => /renamed-script\.[0-9a-f]{20}\.js/.test(n))).toBeTruthy();
    expect(fileNames.some(n => /renamed-script\.[0-9a-f]{20}\.js\.map/.test(n))).toBeTruthy();
    expect(fileNames.some(n => /script\.[0-9a-f]{20}\.js/.test(n))).toBeTruthy();
    expect(await files['lazy-script.js']).not.toBeUndefined();
    expect(await files['lazy-script.js.map']).not.toBeUndefined();
    expect(await files['renamed-lazy-script.js']).not.toBeUndefined();
    expect(await files['renamed-lazy-script.js.map']).not.toBeUndefined();
  });

  it('preserves script order', async () => {
    host.writeMultipleFiles(scripts);

    const { files } = await browserBuild(architect, host, target, {
      scripts: getScriptsOption(),
    } as {});

    expect(await files['scripts.js']).toMatch(new RegExp(
      /.*['"]input-script['"](.|\n|\r)*/.source
      + /['"]zinput-script['"](.|\n|\r)*/.source
      + /['"]finput-script['"](.|\n|\r)*/.source
      + /['"]uinput-script['"](.|\n|\r)*/.source
      + /['"]binput-script['"](.|\n|\r)*/.source
      + /['"]ainput-script['"](.|\n|\r)*/.source
      + /['"]cinput-script['"]/.source,
    ));
  });

  it('chunk in entry', async () => {
    host.writeMultipleFiles(scripts);

    const logger = new logging.Logger('build-script-chunk-entry');
    const logs: string[] = [];
    logger.subscribe(({ message }) => {
      logs.push(message);
    });

    await browserBuild(
      architect,
      host,
      target,
      {
        scripts: getScriptsOption(),
      } as {},
      { logger },
    );

    expect(logs.join('\n')).toMatch(/\(lazy-script\) 69 bytes.*\[entry].*\[rendered]/);
    expect(logs.join('\n')).toMatch(/\(renamed-script\) 78 bytes.*\[entry].*\[rendered]/);
    expect(logs.join('\n')).toMatch(/\(renamed-lazy-script\) 88 bytes.*\[entry].*\[rendered]/);
  });
});
