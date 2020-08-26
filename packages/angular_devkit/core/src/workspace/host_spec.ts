/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { test } from '../virtual-fs/host';
import { WorkspaceHost, createWorkspaceHost } from './host';


describe('createWorkspaceHost', () => {
  let testHost: test.TestHost;
  let workspaceHost: WorkspaceHost;

  beforeEach(() => {
    testHost = new test.TestHost({
      'abc.txt': 'abcdefg',
      'foo/bar.json': '{}',
    });
    workspaceHost = createWorkspaceHost(testHost);
  });

  it('supports isFile', async (done) => {
    expect(await workspaceHost.isFile('abc.txt')).toBeTruthy();
    expect(await workspaceHost.isFile('foo/bar.json')).toBeTruthy();
    expect(await workspaceHost.isFile('foo\\bar.json')).toBeTruthy();

    expect(await workspaceHost.isFile('foo')).toBeFalsy();
    expect(await workspaceHost.isFile('not.there')).toBeFalsy();

    done();
  });

  it('supports isDirectory', async (done) => {
    expect(await workspaceHost.isDirectory('foo')).toBeTruthy();
    expect(await workspaceHost.isDirectory('foo/')).toBeTruthy();
    expect(await workspaceHost.isDirectory('foo\\')).toBeTruthy();

    expect(await workspaceHost.isDirectory('abc.txt')).toBeFalsy();
    expect(await workspaceHost.isDirectory('foo/bar.json')).toBeFalsy();
    expect(await workspaceHost.isDirectory('not.there')).toBeFalsy();

    done();
  });

  it('supports readFile', async (done) => {
    expect(await workspaceHost.readFile('abc.txt')).toBe('abcdefg');

    done();
  });

  it('supports writeFile', async (done) => {
    await workspaceHost.writeFile('newfile', 'baz');
    expect(testHost.files.sort() as string[]).toEqual([
      '/abc.txt',
      '/foo/bar.json',
      '/newfile',
    ]);

    expect(testHost.$read('newfile')).toBe('baz');

    done();
  });

});
