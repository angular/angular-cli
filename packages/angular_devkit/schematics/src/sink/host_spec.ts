/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { normalize, virtualFs } from '@angular-devkit/core';
import { HostSink } from '@angular-devkit/schematics';
import { HostCreateTree, HostTree } from '../tree/host-tree';
import { optimize } from '../tree/static';


describe('FileSystemSink', () => {
  it('works', done => {
    const host = new virtualFs.test.TestHost({
      '/hello': 'world',
      '/sub/directory/file2': '',
      '/sub/file1': '',
    });
    const tree = new HostCreateTree(host);

    tree.create('/test', 'testing 1 2');
    const recorder = tree.beginUpdate('/test');
    recorder.insertLeft(8, 'testing ');
    tree.commitUpdate(recorder);

    const files = ['/hello', '/sub/directory/file2', '/sub/file1', '/test'];
    const treeFiles: string[] = [];
    tree.visit(path => treeFiles.push(path));
    treeFiles.sort();
    expect(treeFiles).toEqual(files);

    const outputHost = new virtualFs.test.TestHost();
    const sink = new HostSink(outputHost);
    sink.commit(optimize(tree))
        .toPromise()
        .then(() => {
          const tmpFiles = outputHost.files.sort();
          expect(tmpFiles as string[]).toEqual(files);
          expect(outputHost.sync.read(normalize('/test')).toString())
            .toBe('testing testing 1 2');
        })
        .then(done, done.fail);
  });

  describe('complex tests', () => {
    beforeEach(done => {
      // Commit a version of the tree.
      const host = new virtualFs.test.TestHost({
        '/file0': '/file0',
        '/sub/directory/file2': '/sub/directory/file2',
        '/sub/file1': '/sub/file1',
      });
      const tree = new HostCreateTree(host);

      const outputHost = new virtualFs.test.TestHost();
      const sink = new HostSink(outputHost);
      sink.commit(optimize(tree))
          .toPromise()
          .then(done, done.fail);
    });

    it('can rename files', done => {
      const host = new virtualFs.test.TestHost({
        '/file0': '/file0',
      });
      const tree = new HostTree(host);
      tree.rename('/file0', '/file1');

      const sink = new HostSink(host);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(host.sync.exists(normalize('/file0'))).toBe(false);
            expect(host.sync.exists(normalize('/file1'))).toBe(true);
          })
          .then(done, done.fail);
    });


    it('can rename nested files', done => {
      const host = new virtualFs.test.TestHost({
        '/sub/directory/file2': '',
      });
      const tree = new HostTree(host);
      tree.rename('/sub/directory/file2', '/another-directory/file2');

      const sink = new HostSink(host);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(host.sync.exists(normalize('/sub/directory/file2'))).toBe(false);
            expect(host.sync.exists(normalize('/another-directory/file2'))).toBe(true);
          })
          .then(done, done.fail);
    });

    it('can delete and create the same file', done => {
      const host = new virtualFs.test.TestHost({
        '/file0': 'world',
      });
      const tree = new HostTree(host);
      tree.delete('/file0');
      tree.create('/file0', 'hello');

      const sink = new HostSink(host);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(host.sync.read(normalize('/file0')).toString()).toBe('hello');
          })
          .then(done, done.fail);
    });

    it('can rename then create the same file', done => {
      const host = new virtualFs.test.TestHost({
        '/file0': 'world',
      });
      const tree = new HostTree(host);

      tree.rename('/file0', '/file1');
      expect(tree.exists('/file0')).toBeFalsy();
      expect(tree.exists('/file1')).toBeTruthy();

      tree.create('/file0', 'hello');
      expect(tree.exists('/file0')).toBeTruthy();

      const sink = new HostSink(host);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(host.sync.read(normalize('/file0')).toString()).toBe('hello');
            expect(virtualFs.fileBufferToString(host.sync.read(normalize('/file1')))).toBe('world');
          })
          .then(done, done.fail);
    });
  });
});
