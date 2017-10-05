/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import * as glob from 'glob';
import { join } from 'path';
import { FileSystemCreateTree } from '../tree/filesystem';
import { InMemoryFileSystemTreeHost } from '../tree/memory-host';
import { optimize } from '../tree/static';
import { FileSystemSink } from './filesystem';

const temp = require('temp');


describe('FileSystemSink', () => {
  let outputRoot: string;

  beforeEach(() => {
    outputRoot = temp.mkdirSync('schematics-spec-');
  });

  it('works', done => {
    const host = new InMemoryFileSystemTreeHost({
      '/hello': 'world',
      '/sub/directory/file2': '',
      '/sub/file1': '',
    });
    const tree = new FileSystemCreateTree(host);

    tree.create('/test', 'testing 1 2');
    const recorder = tree.beginUpdate('/test');
    recorder.insertLeft(8, 'testing ');
    tree.commitUpdate(recorder);

    const files = ['/hello', '/sub/directory/file2', '/sub/file1', '/test'];
    expect(tree.files).toEqual(files);

    const sink = new FileSystemSink(outputRoot);
    sink.commit(optimize(tree))
      .toPromise()
      .then(() => {
        const tmpFiles = glob.sync(join(outputRoot, '**/*'), { nodir: true });
        expect(tmpFiles.map(x => x.substr(outputRoot.length))).toEqual(files);
        expect(fs.readFileSync(join(outputRoot, 'test'), 'utf-8')).toBe('testing testing 1 2');
      })
      .then(done, done.fail);
  });
});
