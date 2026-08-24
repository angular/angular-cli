/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createPackageManager } from './factory';
import { NodeJS_HOST } from './host';

describe('createPackageManager', () => {
  let runCommandSpy: jasmine.Spy;

  beforeEach(() => {
    runCommandSpy = spyOn(NodeJS_HOST, 'runCommand');
  });

  it('should create PackageManager without spawning any subprocesses', async () => {
    const pm = await createPackageManager({
      cwd: '/tmp',
    });

    expect(pm).toBeDefined();
    expect(runCommandSpy).not.toHaveBeenCalled();
  });

  it('should respect configured package manager name and version without running commands', async () => {
    const pm = await createPackageManager({
      cwd: '/tmp',
      configuredPackageManager: ['pnpm', '9.1.0'],
    });

    expect(pm.name).toBe('pnpm');
    expect(pm.version).toBe('9.1.0');
    expect(runCommandSpy).not.toHaveBeenCalled();
  });

  it('should detect yarn-classic when configured with yarn version < 2', async () => {
    const pm = await createPackageManager({
      cwd: '/tmp',
      configuredPackageManager: ['yarn', '1.22.19'],
    });

    expect(pm.name).toBe('yarn');
    expect(pm.version).toBe('1.22.19');
    expect(runCommandSpy).not.toHaveBeenCalled();
  });

  it('should maintain modern yarn when configured with yarn version >= 2', async () => {
    const pm = await createPackageManager({
      cwd: '/tmp',
      configuredPackageManager: ['yarn', '4.4.1'],
    });

    expect(pm.name).toBe('yarn');
    expect(pm.version).toBe('4.4.1');
    expect(runCommandSpy).not.toHaveBeenCalled();
  });

  it('should throw for unsupported package manager', async () => {
    await expectAsync(
      createPackageManager({
        cwd: '/tmp',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        configuredPackageManager: ['invalid-pm' as any],
      }),
    ).toBeRejectedWithError('Unsupported package manager: "invalid-pm"');
  });
});
