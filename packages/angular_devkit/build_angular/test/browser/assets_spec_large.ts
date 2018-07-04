/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { tap, toArray } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder assets', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
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

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        // Assets we expect should be there.
        Object.keys(matches).forEach(fileName => {
          const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
          expect(content).toMatch(matches[fileName]);
        });
        // .gitkeep should not be there.
        expect(host.scopedSync().exists(normalize('./dist/folder/.gitkeep'))).toBe(false);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('fails with non-absolute output path', (done) => {
    const assets: { [path: string]: string } = {
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    };
    host.writeMultipleFiles(assets);
    const overrides = {
      assets: [{
        glob: '**/*', input: '../node_modules/some-package/', output: '../temp',
      }],
    };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);

    // The node_modules folder must be deleted, otherwise code that tries to find the
    // node_modules folder will hit this one and can fail.
    host.scopedSync().delete(normalize('./node_modules'));
  });

  it('fails with non-source root input path', (done) => {
    const assets: { [path: string]: string } = {
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    };
    host.writeMultipleFiles(assets);
    const overrides = {
      assets: ['not-source-root/file.txt'],
    };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);

    // The node_modules folder must be deleted, otherwise code that tries to find the
    // node_modules folder will hit this one and can fail.
    host.scopedSync().delete(normalize('./node_modules'));
  });

  it('still builds with empty asset array', (done) => {
    const overrides = {
      assets: [],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      toArray(),
      tap((buildEvents) => expect(buildEvents.length).toBe(1)),
    ).toPromise().then(done, done.fail);
  });
});
