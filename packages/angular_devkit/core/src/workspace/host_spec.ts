/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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

  it('supports isFile', async () => {
    expect(await workspaceHost.isFile('abc.txt')).toBeTruthy();
    expect(await workspaceHost.isFile('foo/bar.json')).toBeTruthy();
    expect(await workspaceHost.isFile('foo\\bar.json')).toBeTruthy();

    expect(await workspaceHost.isFile('foo')).toBeFalsy();
    expect(await workspaceHost.isFile('not.there')).toBeFalsy();
  });

  it('supports isDirectory', async () => {
    expect(await workspaceHost.isDirectory('foo')).toBeTruthy();
    expect(await workspaceHost.isDirectory('foo/')).toBeTruthy();
    expect(await workspaceHost.isDirectory('foo\\')).toBeTruthy();

    expect(await workspaceHost.isDirectory('abc.txt')).toBeFalsy();
    expect(await workspaceHost.isDirectory('foo/bar.json')).toBeFalsy();
    expect(await workspaceHost.isDirectory('not.there')).toBeFalsy();
  });

  it('supports readFile', async () => {
    expect(await workspaceHost.readFile('abc.txt')).toBe('abcdefg');
  });

  it('supports writeFile', async () => {
    await workspaceHost.writeFile('newfile', 'baz');
    expect(testHost.files.sort() as string[]).toEqual(['/abc.txt', '/foo/bar.json', '/newfile']);

    expect(testHost.$read('newfile')).toBe('baz');
  });
});
