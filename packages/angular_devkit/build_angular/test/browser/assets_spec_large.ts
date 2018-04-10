/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder assets', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    const assets: { [path: string]: string } = {
      './src/folder/.gitkeep': '',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
    };
    const matches: { [path: string]: string } = {
      './dist/folder/folder-asset.txt': 'folder-asset.txt',
      './dist/glob-asset.txt': 'glob-asset.txt',
      './dist/output-folder/output-asset.txt': 'output-asset.txt',
    };
    host.writeMultipleFiles(assets);

    const overrides = {
      assets: [
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
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

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

    runTargetSpec(host, browserTargetSpec, overrides).subscribe(undefined, done, done.fail);

    // The node_modules folder must be deleted, otherwise code that tries to find the
    // node_modules folder will hit this one and can fail.
    host.scopedSync().delete(normalize('./node_modules'));
  }, Timeout.Basic);
});
