/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
// tslint:disable:no-non-null-assertion
import { fragment, normalize } from '@angular-devkit/core';
import { stringToFileBuffer } from './buffer';
import { SimpleMemoryHost } from './memory';
import { SyncDelegateHost } from './sync';

describe('SimpleMemoryHost', () => {

  it('can watch', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    host.write(normalize('/sub/file1'), stringToFileBuffer(''));

    let recursiveCalled = 0;
    let noRecursiveCalled = 0;
    let noRecursiveFileCalled = 0;
    let diffFile = 0;

    host.watch(normalize('/sub'), { recursive: true }) !.subscribe(() => recursiveCalled++);
    host.watch(normalize('/sub')) !.subscribe(() => noRecursiveCalled++);
    host.watch(normalize('/sub/file2')) !.subscribe(() => noRecursiveFileCalled++);
    host.watch(normalize('/sub/file3')) !.subscribe(() => diffFile++);

    host.write(normalize('/sub/file2'), stringToFileBuffer(''));

    expect(recursiveCalled).toBe(1);
    expect(noRecursiveCalled).toBe(0);
    expect(noRecursiveFileCalled).toBe(1);
    expect(diffFile).toBe(0);

    host.write(normalize('/sub/file3'), stringToFileBuffer(''));

    expect(recursiveCalled).toBe(2);
    expect(noRecursiveCalled).toBe(0);
    expect(noRecursiveFileCalled).toBe(1);
    expect(diffFile).toBe(1);
  });

  it('can read', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    host.write(normalize('/hello'), buffer);
    expect(host.read(normalize('/hello'))).toBe(buffer);
  });

  it('can delete', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    expect(host.exists(normalize('/sub/file1'))).toBe(false);
    host.write(normalize('/sub/file1'), buffer);
    expect(host.exists(normalize('/sub/file1'))).toBe(true);
    host.delete(normalize('/sub/file1'));
    expect(host.exists(normalize('/sub/file1'))).toBe(false);
  });

  it('can delete directory', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    expect(host.exists(normalize('/sub/file1'))).toBe(false);
    host.write(normalize('/sub/file1'), buffer);
    host.write(normalize('/subfile.2'), buffer);
    expect(host.exists(normalize('/sub/file1'))).toBe(true);
    expect(host.exists(normalize('/subfile.2'))).toBe(true);
    host.delete(normalize('/sub'));
    expect(host.exists(normalize('/sub/file1'))).toBe(false);
    expect(host.exists(normalize('/sub'))).toBe(false);
    expect(host.exists(normalize('/subfile.2'))).toBe(true);
  });

  it('can rename', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    expect(host.exists(normalize('/sub/file1'))).toBe(false);
    host.write(normalize('/sub/file1'), buffer);
    expect(host.exists(normalize('/sub/file1'))).toBe(true);
    host.rename(normalize('/sub/file1'), normalize('/sub/file2'));
    expect(host.exists(normalize('/sub/file1'))).toBe(false);
    expect(host.exists(normalize('/sub/file2'))).toBe(true);
    expect(host.read(normalize('/sub/file2'))).toBe(buffer);
  });

  it('can list', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    host.write(normalize('/sub/file1'), buffer);
    host.write(normalize('/sub/file2'), buffer);
    host.write(normalize('/sub/sub1/file3'), buffer);
    host.write(normalize('/file4'), buffer);

    expect(host.list(normalize('/sub')))
      .toEqual([fragment('file1'), fragment('file2'), fragment('sub1')]);
    expect(host.list(normalize('/')))
      .toEqual([fragment('sub'), fragment('file4')]);
    expect(host.list(normalize('/inexistent'))).toEqual([]);
  });

  it('supports isFile / isDirectory', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');

    host.write(normalize('/sub/file1'), buffer);
    host.write(normalize('/sub/file2'), buffer);
    host.write(normalize('/sub/sub1/file3'), buffer);
    host.write(normalize('/file4'), buffer);

    expect(host.isFile(normalize('/sub'))).toBe(false);
    expect(host.isFile(normalize('/sub1'))).toBe(false);
    expect(host.isDirectory(normalize('/'))).toBe(true);
    expect(host.isDirectory(normalize('/sub'))).toBe(true);
    expect(host.isDirectory(normalize('/sub/sub1'))).toBe(true);
    expect(host.isDirectory(normalize('/sub/file1'))).toBe(false);
    expect(host.isDirectory(normalize('/sub/sub1/file3'))).toBe(false);
  });

  it('makes every path absolute', () => {
    const host = new SyncDelegateHost(new SimpleMemoryHost());

    const buffer = stringToFileBuffer('hello');
    const buffer2 = stringToFileBuffer('hello 2');

    host.write(normalize('file1'), buffer);
    host.write(normalize('/sub/file2'), buffer);
    host.write(normalize('sub/file2'), buffer2);
    expect(host.isFile(normalize('file1'))).toBe(true);
    expect(host.isFile(normalize('/file1'))).toBe(true);
    expect(host.isFile(normalize('/sub/file2'))).toBe(true);
    expect(host.read(normalize('sub/file2'))).toBe(buffer2);
    expect(host.isDirectory(normalize('/sub'))).toBe(true);
    expect(host.isDirectory(normalize('sub'))).toBe(true);
  });
});
