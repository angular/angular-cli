/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { discover } from './discovery';
import { MockHost } from './testing/mock-host';

describe('discover', () => {
  it('should find a lockfile in the starting directory', async () => {
    const host = new MockHost({
      '/project': ['package-lock.json'],
    });
    const result = await discover(host, '/project');
    expect(result).toBe('npm');
  });

  it('should find a lockfile in a parent directory', async () => {
    const host = new MockHost({
      '/project': ['yarn.lock'],
      '/project/subdir': [],
    });
    const result = await discover(host, '/project/subdir');
    expect(result).toBe('yarn');
  });

  it('should return null if no lockfile is found up to the root', async () => {
    const host = new MockHost({
      '/': [],
      '/project': [],
      '/project/subdir': [],
    });
    const result = await discover(host, '/project/subdir');
    expect(result).toBeNull();
  });

  it('should apply precedence when multiple lockfiles are found', async () => {
    const host = new MockHost({
      '/project': ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'],
    });
    // pnpm should have the highest precedence according to the descriptor.
    const result = await discover(host, '/project');
    expect(result).toBe('pnpm');
  });

  it('should stop searching at a .git boundary', async () => {
    const host = new MockHost({
      '/': ['yarn.lock'],
      '/project/.git': true, // .git is mocked as a directory.
      '/project/subdir': [],
    });
    const result = await discover(host, '/project/subdir');
    expect(result).toBeNull();
  });

  it('should stop searching at the filesystem root', async () => {
    const host = new MockHost({
      '/': [],
    });
    const result = await discover(host, '/');
    expect(result).toBeNull();
  });

  it('should handle file system errors during readdir gracefully', async () => {
    const host = new MockHost({});
    host.readdir = () => Promise.reject(new Error('Permission denied'));

    const result = await discover(host, '/project');
    expect(result).toBeNull();
  });

  it('should handle file system errors during stat gracefully', async () => {
    const host = new MockHost({ '/project': ['.git'] });
    host.stat = () => Promise.reject(new Error('Permission denied'));

    // The error on stat should prevent it from finding the .git dir and thus it will continue to the root.
    const result = await discover(host, '/project');
    expect(result).toBeNull();
  });

  it('should prioritize the closest lockfile, regardless of precedence', async () => {
    const host = new MockHost({
      '/project': ['pnpm-lock.yaml'], // Higher precedence
      '/project/subdir': ['package-lock.json'], // Lower precedence
    });
    const result = await discover(host, '/project/subdir');
    // Should find 'npm' and stop, not continue to find 'pnpm'.
    expect(result).toBe('npm');
  });

  it('should find a lockfile in the git root directory', async () => {
    const host = new MockHost({
      '/project': ['yarn.lock'],
      '/project/.git': true,
      '/project/subdir': [],
    });
    const result = await discover(host, '/project/subdir');
    expect(result).toBe('yarn');
  });

  it('should discover the alternate npm lockfile name', async () => {
    const host = new MockHost({
      '/project': ['npm-shrinkwrap.json'],
    });
    const result = await discover(host, '/project');
    expect(result).toBe('npm');
  });

  it('should discover the alternate bun lockfile name', async () => {
    const host = new MockHost({
      '/project': ['bun.lockb'],
    });
    const result = await discover(host, '/project');
    expect(result).toBe('bun');
  });
});
