/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import * as path from 'path';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/toPromise';
import { FileSystemCreateTree, FileSystemTree } from '../tree/filesystem';
import { InMemoryFileSystemTreeHost } from '../tree/memory-host';
import { optimize } from '../tree/static';
import { DryRunSink } from './dryrun';

const temp = require('temp');


const host = new InMemoryFileSystemTreeHost({
  '/hello': '',
  '/sub/file1': '',
  '/sub/directory/file2': '',
});


describe('DryRunSink', () => {
  let outputRoot: string;

  beforeEach(() => {
    outputRoot = temp.mkdirSync('schematics-spec-');
  });

  it('works when creating everything', done => {
    const tree = new FileSystemCreateTree(host);

    tree.create('/test', 'testing 1 2');
    const recorder = tree.beginUpdate('/test');
    recorder.insertLeft(8, 'testing ');
    tree.commitUpdate(recorder);
    tree.overwrite('/hello', 'world');

    const files = ['/hello', '/sub/directory/file2', '/sub/file1', '/test'];
    expect(tree.files).toEqual(files);

    const sink = new DryRunSink(outputRoot);
    sink.reporter
      .toArray()
      .toPromise()
      .then(infos => {
        expect(infos.length).toBe(4);
        for (const info of infos) {
          expect(info.kind).toBe('create');
        }
      })
      .then(done, done.fail);

    sink.commit(optimize(tree))
      .subscribe({ error: done.fail });
  });

  it('works with root', done => {
    const tree = new FileSystemTree(host);

    tree.create('/test', 'testing 1 2');
    const recorder = tree.beginUpdate('/test');
    recorder.insertLeft(8, 'testing ');
    tree.commitUpdate(recorder);
    tree.overwrite('/hello', 'world');

    const files = ['/hello', '/sub/directory/file2', '/sub/file1', '/test'];
    expect(tree.files).toEqual(files);

    // Need to create this file on the filesystem, otherwise the commit phase will fail.
    fs.writeFileSync(path.join(outputRoot, 'hello'), '');
    const sink = new DryRunSink(outputRoot);
    sink.reporter
      .toArray()
      .toPromise()
      .then(infos => {
        expect(infos.length).toBe(2);
        expect(infos.map(x => x.kind)).toEqual(['create', 'update']);
      })
      .then(done, done.fail);

    sink.commit(optimize(tree))
      .subscribe({ error: done.fail });
  });
});
