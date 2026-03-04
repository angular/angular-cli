/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { HostCreateTree, HostTree } from '../tree/host-tree';
import { HostSink } from './host';

describe('FileSystemSink', () => {
  it('works', async () => {
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
    tree.visit((path) => treeFiles.push(path));
    treeFiles.sort();
    expect(treeFiles).toEqual(files);

    const outputHost = new virtualFs.test.TestHost();
    const sink = new HostSink(outputHost);
    await sink.commit(tree).toPromise();
    const tmpFiles = outputHost.files.sort();
    expect(tmpFiles as string[]).toEqual(files);
    expect(outputHost.sync.read(normalize('/test')).toString()).toBe('testing testing 1 2');
  });

  describe('complex tests', () => {
    beforeEach(async () => {
      // Commit a version of the tree.
      const host = new virtualFs.test.TestHost({
        '/file0': '/file0',
        '/sub/directory/file2': '/sub/directory/file2',
        '/sub/file1': '/sub/file1',
      });
      const tree = new HostCreateTree(host);

      const outputHost = new virtualFs.test.TestHost();
      const sink = new HostSink(outputHost);
      await sink.commit(tree).toPromise();
    });

    it('can rename files', async () => {
      const host = new virtualFs.test.TestHost({
        '/file0': '/file0',
      });
      const tree = new HostTree(host);
      tree.rename('/file0', '/file1');

      const sink = new HostSink(host);
      await sink.commit(tree).toPromise();
      expect(host.sync.exists(normalize('/file0'))).toBe(false);
      expect(host.sync.exists(normalize('/file1'))).toBe(true);
    });

    it('can rename nested files', async () => {
      const host = new virtualFs.test.TestHost({
        '/sub/directory/file2': '',
      });
      const tree = new HostTree(host);
      tree.rename('/sub/directory/file2', '/another-directory/file2');

      const sink = new HostSink(host);
      await sink.commit(tree).toPromise();
      expect(host.sync.exists(normalize('/sub/directory/file2'))).toBe(false);
      expect(host.sync.exists(normalize('/another-directory/file2'))).toBe(true);
    });

    it('can delete and create the same file', async () => {
      const host = new virtualFs.test.TestHost({
        '/file0': 'world',
      });
      const tree = new HostTree(host);
      tree.delete('/file0');
      tree.create('/file0', 'hello');

      const sink = new HostSink(host);
      await sink.commit(tree).toPromise();
      expect(host.sync.read(normalize('/file0')).toString()).toBe('hello');
    });

    it('can rename then create the same file', async () => {
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
      await sink.commit(tree).toPromise();
      expect(host.sync.read(normalize('/file0')).toString()).toBe('hello');
      expect(virtualFs.fileBufferToString(host.sync.read(normalize('/file1')))).toBe('world');
    });

    it('can rename then modify the same file', async () => {
      const host = new virtualFs.test.TestHost({
        '/file0': 'world',
      });
      const tree = new HostTree(host);

      tree.rename('/file0', '/file1');
      expect(tree.exists('/file0')).toBeFalsy();
      expect(tree.exists('/file1')).toBeTruthy();

      tree.overwrite('/file1', 'hello');

      const sink = new HostSink(host);
      await sink.commit(tree).toPromise();
      expect(virtualFs.fileBufferToString(host.sync.read(normalize('/file1')))).toBe('hello');
    });
  });
});
