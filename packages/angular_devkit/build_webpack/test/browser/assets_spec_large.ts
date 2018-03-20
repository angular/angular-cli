/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


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
        { glob: 'glob-asset.txt' },
        { glob: 'output-asset.txt', output: 'output-folder' },
        { glob: '**/*', input: 'src/folder', output: 'folder' },
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
  }, 30000);

  // TODO: this test isn't working correctly, fix it.
  // It throws a weird jasmine error:
  // Error: Spies must be created in a before function or a spec
  // it('allowOutsideOutDir false with outside throws error', (done) => {
  //   const assets: { [path: string]: string } = {
  //     './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
  //   };
  //   host.writeMultipleFiles(assets);

  //   const overrides = {
  //     assets: [
  //       { glob: '**/*', input: '../node_modules/some-package/', output: '../temp' },
  //     ],
  //   };

  //   architect.loadWorkspaceFromJson(makeWorkspace(browserTargetSpec)).pipe(
  //     concatMap(() => architect.run(architect.getTarget({ overrides }))),
  //   ).subscribe(undefined, (err) => {
  //     expect(err.message)
  //       .toContain('An asset cannot be written to a location outside of the output path');
  //     expect(err.message).toContain('You can override this message by');
  //     done();
  //   }, done.fail);
  // }, 30000);

  it('allowOutsideOutDir true with outside does not throw error', (done) => {
    const assets: { [path: string]: string } = {
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    };
    host.writeMultipleFiles(assets);
    const overrides = {
      assets: [
        {
          glob: '**/*', input: '../node_modules/some-package/', output: '../temp',
          allowOutsideOutDir: true,
        },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
