/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { normalize } from '@angular-devkit/core';
import { FileSystemTree, FileSystemTreeHost } from '@angular-devkit/schematics';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { join } from 'path';
import { FileSystemCreateTree } from '../tree/filesystem';
import { InMemoryFileSystemTreeHost } from '../tree/memory-host';
import { optimize } from '../tree/static';
import { FileSystemSink } from './filesystem';

const temp = require('temp');


// Tools cannot be a dependency of schematics, so we just put the same interface here.
export class FileSystemHost implements FileSystemTreeHost {
  constructor(private _root: string) {}

  listDirectory(path: string) {
    return fs.readdirSync(join(this._root, path));
  }
  isDirectory(path: string) {
    return fs.statSync(join(this._root, path)).isDirectory();
  }
  readFile(path: string) {
    return fs.readFileSync(join(this._root, path));
  }
  exists(path: string) {
    return fs.existsSync(this.join(this._root, path));
  }

  join(path1: string, path2: string) {
    return join(path1, path2);
  }
}


describe('FileSystemSink', () => {
  let outputRoot: string;

  beforeEach(() => {
    outputRoot = temp.mkdirSync('schematics-spec-');
  });
  afterEach(() => {
    // Delete the whole temporary directory.
    function rmdir(systemPath: string) {
      for (const name of fs.readdirSync(systemPath)) {
        const systemName = path.join(systemPath, name);
        if (fs.statSync(systemName).isDirectory()) {
          rmdir(systemName);
          fs.rmdirSync(systemName);
        } else {
          fs.unlinkSync(systemName);
        }
      }
    }

    rmdir(outputRoot);
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
    expect(tree.files).toEqual(files.map(normalize));

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

  describe('complex tests', () => {
    beforeEach(done => {
      // Commit a version of the tree.
      const host = new InMemoryFileSystemTreeHost({
        '/file0': '/file0',
        '/sub/directory/file2': '/sub/directory/file2',
        '/sub/file1': '/sub/file1',
      });
      const tree = new FileSystemCreateTree(host);

      const sink = new FileSystemSink(outputRoot);
      sink.commit(optimize(tree))
          .toPromise()
          .then(done, done.fail);
    });

    it('can rename files', done => {
      const tree = new FileSystemTree(new FileSystemHost(outputRoot));
      tree.rename('/file0', '/file1');

      const sink = new FileSystemSink(outputRoot);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(fs.existsSync(join(outputRoot, 'file0'))).toBe(false);
            expect(fs.existsSync(join(outputRoot, 'file1'))).toBe(true);
          })
          .then(done, done.fail);
    });


    it('can rename nested files', done => {
      const tree = new FileSystemTree(new FileSystemHost(outputRoot));
      tree.rename('/sub/directory/file2', '/another-directory/file2');

      const sink = new FileSystemSink(outputRoot);
      sink.commit(optimize(tree))
          .toPromise()
          .then(() => {
            expect(fs.existsSync(join(outputRoot, '/sub/directory/file2'))).toBe(false);
            expect(fs.existsSync(join(outputRoot, '/another-directory/file2'))).toBe(true);
          })
          .then(done, done.fail);
    });

    it('can delete and create the same file', done => {
      const tree = new FileSystemTree(new FileSystemHost(outputRoot));
      tree.delete('/file0');
      tree.create('/file0', 'hello');

      const sink = new FileSystemSink(outputRoot);
      sink.commit(optimize(tree))
          .toPromise()
          .then(done, done.fail);
    });
  });
});
