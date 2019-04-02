/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { toArray } from 'rxjs/operators';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host } from '../utils';


describe('Browser Builder assets', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const assets: { [path: string]: string } = {
      './src/folder/.gitkeep': '',
      './src/string-file-asset.txt': 'string-file-asset.txt',
      './src/string-folder-asset/file.txt': 'string-folder-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
    };
    const matches: { [path: string]: string } = {
      './dist/string-file-asset.txt': 'string-file-asset.txt',
      './dist/string-folder-asset/file.txt': 'string-folder-asset.txt',
      './dist/glob-asset.txt': 'glob-asset.txt',
      './dist/folder/folder-asset.txt': 'folder-asset.txt',
      './dist/output-folder/output-asset.txt': 'output-asset.txt',
    };
    host.writeMultipleFiles(assets);

    const overrides = {
      assets: [
        'src/string-file-asset.txt',
        'src/string-folder-asset',
        { glob: 'glob-asset.txt', input: 'src/', output: '/' },
        { glob: 'glob-asset.txt', input: 'src/', output: '/' },
        { glob: 'output-asset.txt', input: 'src/', output: '/output-folder' },
        { glob: '**/*', input: 'src/folder', output: '/folder' },
      ],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    // Assets we expect should be there.
    Object.keys(matches).forEach(fileName => {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
      expect(content).toMatch(matches[fileName]);
    });
    // .gitkeep should not be there.
    expect(host.scopedSync().exists(normalize('./dist/folder/.gitkeep'))).toBe(false);

    await run.stop();
  });

  it('works with ignored patterns', async () => {
    const assets: { [path: string]: string } = {
      './src/folder/.gitkeep': '',
      './src/folder/asset-ignored.txt': '',
      './src/folder/asset.txt': '',
    };

    host.writeMultipleFiles(assets);

    const overrides = {
      assets: [
        {
          glob: '**/*',
          ignore: ['asset-ignored.txt'],
          input: 'src/folder',
          output: '/folder',
        },
      ],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    expect(host.scopedSync().exists(normalize('./dist/folder/asset.txt'))).toBe(true);
    expect(host.scopedSync().exists(normalize('./dist/folder/asset-ignored.txt'))).toBe(false);
    expect(host.scopedSync().exists(normalize('./dist/folder/.gitkeep'))).toBe(false);

    await run.stop();
  });

  it('fails with non-absolute output path', async () => {
    const assets: { [path: string]: string } = {
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    };
    host.writeMultipleFiles(assets);
    const overrides = {
      assets: [{
        glob: '**/*', input: '../node_modules/some-package/', output: '../temp',
      }],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('');
    } catch {}

    // The node_modules folder must be deleted, otherwise code that tries to find the
    // node_modules folder will hit this one and can fail.
    host.scopedSync().delete(normalize('./node_modules'));

    await run.stop();
  });

  it('fails with non-source root input path', async () => {
    const assets: { [path: string]: string } = {
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    };
    host.writeMultipleFiles(assets);
    const overrides = {
      assets: ['not-source-root/file.txt'],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('');
    } catch {}

    // The node_modules folder must be deleted, otherwise code that tries to find the
    // node_modules folder will hit this one and can fail.
    host.scopedSync().delete(normalize('./node_modules'));

    await run.stop();
  });

  it('still builds with empty asset array', async () => {
    const overrides = {
      assets: [],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const events = await run.output.pipe(toArray()).toPromise();
    expect(events.length).toBe(1);

    await run.stop();
  });
});
