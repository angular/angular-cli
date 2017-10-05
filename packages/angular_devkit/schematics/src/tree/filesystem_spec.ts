/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { FileSystemTree } from './filesystem';
import { InMemoryFileSystemTreeHost } from './memory-host';


describe('FileSystem', () => {
  it('can create files', () => {
    const host = new InMemoryFileSystemTreeHost({
      '/hello': 'world',
      '/sub/directory/file2': '',
      '/sub/file1': '',
    });
    const tree = new FileSystemTree(host);

    expect(tree.files).toEqual(['/hello', '/sub/directory/file2', '/sub/file1'].map(normalize));
  });
});
