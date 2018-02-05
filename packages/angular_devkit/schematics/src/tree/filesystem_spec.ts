/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:non-null-operator
import { PathIsFileException, normalize, virtualFs } from '@angular-devkit/core';
import { testTreeVisit } from './common_spec';
import { FileSystemTree } from './filesystem';


describe('FileSystemDirEntry', () => {
  testTreeVisit({
    createTree: paths => {
      const files: {[key: string]: string} = {};
      paths.forEach(path => files[path] = path);

      const host = new virtualFs.test.TestHost(files);
      const tree = new FileSystemTree(host);

      return tree;
    },
    sets: [
      {
        name: 'empty',
        files: [],
        visits: [
          {root: '/', expected: []},
        ],
      },

      {
        name: 'file at root',
        files: ['/file'],
        visits: [
          {root: '/'},
          {root: '/file', exception: ({path}) => new PathIsFileException(path)},
        ],
      },
      {
        name: 'file under first level folder',
        // duplicate use case: folder of single file at root
        files: ['/folder/file'],
        visits: [
          {root: '/'},
          {root: '/folder', expected: ['/folder/file']},
          {root: '/folder/file', exception: ({path}) => new PathIsFileException(path)},
          {root: '/wrong', expected: []},
        ],
      },
      {
        name: 'file under nested folder',
        // duplicate use case: nested folder of files
        files: ['/folder/nested_folder/file'],
        visits: [
          {root: '/'},
          {root: '/folder', expected: ['/folder/nested_folder/file']},
          {root: '/folder/nested_folder', expected: ['/folder/nested_folder/file']},
          {
            root: '/folder/nested_folder/file',
            exception: ({path}) => new PathIsFileException(path),
          },
        ],
      },

      {
        name: 'nested folders',
        // duplicate use case: folder of folders at root
        // duplicate use case: folders of mixed
        files: [
          '/folder/nested_folder0/file',
          '/folder/nested_folder1/folder/file',
          '/folder/nested_folder2/file',
          '/folder/nested_folder2/folder/file',
        ],
        visits: [
          {root: '/'},
          {root: '/folder'},
          {root: '/folder/nested_folder0', expected: ['/folder/nested_folder0/file']},
          {root: '/folder/nested_folder1', expected: ['/folder/nested_folder1/folder/file']},
          {root: '/folder/nested_folder1/folder', expected: ['/folder/nested_folder1/folder/file']},
          {root: '/folder/nested_folder2', expected: [
            '/folder/nested_folder2/file',
            '/folder/nested_folder2/folder/file',
          ]},
          {root: '/folder/nested_folder2/folder', expected: ['/folder/nested_folder2/folder/file']},
        ],
      },
    ],
  });
});


describe('FileSystem', () => {
  it('can create files', () => {
    const host = new virtualFs.test.TestHost({
      '/hello': 'world',
      '/sub/directory/file2': '',
      '/sub/file1': '',
    });
    const tree = new FileSystemTree(host);

    expect(tree.files).toEqual(['/hello', '/sub/directory/file2', '/sub/file1'].map(normalize));
  });
});
