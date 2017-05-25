/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {MergeStrategy} from './interface';
import {InMemoryFileSystemTreeHost} from './memory-host';
import {FileSystemTree} from './filesystem';
import {merge, partition} from './static';
import {VirtualTree} from './virtual';
import {FileDoesNotExistException} from '../exception/exception';


describe('VirtualTree', () => {
  describe('exists()', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('/some/file', 'some _content');
      expect(tree.exists('/some/file')).toBe(true);
      expect(tree.exists('/other/file')).toBe(false);
    });
  });
  describe('read()', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('/some/file', 'some _content');
      expect(tree.read('/some/file') !.toString()).toBe('some _content');
      expect(tree.read('/other/file')).toBe(null);
    });
  });
  describe('files', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('/some/file', 'some _content');
      tree.create('/some/other-file', 'some _content');
      tree.create('/some/other-file2', 'some _content');

      expect(tree.files).toEqual([
        '/some/file', '/some/other-file', '/some/other-file2'
      ]);
    });
  });

  describe('overwrite()', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('/some/file', 'some content');
      tree.overwrite('/some/file', 'some other content');

      expect(tree.read('/some/file') !.toString()).toEqual('some other content');
    });
  });

  describe('insertContent()', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('/some/file', 'some _content');
      const recorder = tree.beginUpdate('/some/file');
      recorder.insertLeft(4, ' hello');
      tree.commitUpdate(recorder);

      expect(tree.actions.length).toBe(2);
      expect(tree.read('/some/file') !.toString()).toBe('some hello _content');
    });

    it('throws when the file does not exist', () => {
      const tree = new VirtualTree();
      expect(() => tree.beginUpdate('/some/file'))
        .toThrow(new FileDoesNotExistException('/some/file'));
    });
  });

  describe('combinatorics', () => {
    it('works', () => {
      const tree = new VirtualTree();
      tree.create('file1', 'some _content');
      tree.create('file2', 'some _content');
      tree.create('file3', 'some _content');

      const [tree1, tree2] = partition(tree, p => p == '/file1');
      expect(tree1.exists('file1')).toBe(true);
      expect(tree1.exists('file2')).toBe(false);
      expect(tree1.exists('file3')).toBe(false);

      expect(tree2.exists('file1')).toBe(false);
      expect(tree2.exists('file2')).toBe(true);
      expect(tree2.exists('file3')).toBe(true);

      const tree3 = merge(tree1, tree2, MergeStrategy.Error);
      expect(tree3.files.sort()).toEqual(tree.files.sort());
    });
  });

  describe('optimize', () => {
    it('works', () => {
      const host = new InMemoryFileSystemTreeHost({
        '/hello': 'world'
      });
      const tree = new FileSystemTree(host);

      tree.create('/created', 'test 1');
      tree.create('/hello1', 'test 2');
      tree.overwrite('/hello1', 'beautiful world');
      tree.overwrite('/hello', 'beautiful world');

      expect(tree.actions.length).toBe(4);
      tree.optimize();
      expect(tree.actions.length).toBe(3);
    });

    it('works with branching', () => {
      const host = new InMemoryFileSystemTreeHost({
        '/hello': '',
        '/sub/file1': '',
        '/sub/directory/file2': ''
      });
      const tree = new FileSystemTree(host);

      tree.create('/test', 'testing 1 2');
      const recorder = tree.beginUpdate('/test');
      recorder.insertLeft(8, 'testing ');
      tree.commitUpdate(recorder);
      tree.overwrite('/hello', 'world');
      tree.overwrite('/test', 'test 3');

      const files = ['/hello', '/sub/directory/file2', '/sub/file1', '/test'];
      expect(tree.files).toEqual(files);

      const tree2 = tree.branch() as VirtualTree;
      expect(tree.actions.length).toBe(4);
      expect(tree2.actions.length).toBe(4);

      tree2.optimize();
      expect(tree.actions.length).toBe(4);
      expect(tree2.actions.length).toBe(2);
    });
  });
});
