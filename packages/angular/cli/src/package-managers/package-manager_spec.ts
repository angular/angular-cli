/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Host } from './host';
import { PackageManager } from './package-manager';
import { SUPPORTED_PACKAGE_MANAGERS } from './package-manager-descriptor';
import { MockHost } from './testing/mock-host';

describe('PackageManager', () => {
  let host: Host;
  let runCommandSpy: jasmine.Spy;
  const descriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];

  beforeEach(() => {
    host = new MockHost();
    runCommandSpy = spyOn(host, 'runCommand').and.resolveTo({ stdout: '1.2.3', stderr: '' });
    host.runCommand = runCommandSpy;
  });

  describe('getVersion', () => {
    it('should fetch the version from the package manager if not cached', async () => {
      const pm = new PackageManager(host, '/tmp', descriptor);
      const version = await pm.getVersion();

      expect(version).toBe('1.2.3');
      expect(runCommandSpy).toHaveBeenCalledWith(
        descriptor.binary,
        descriptor.versionCommand,
        jasmine.objectContaining({ cwd: '/tmp' }),
      );
    });

    it('should cache the version after the first fetch', async () => {
      const pm = new PackageManager(host, '/tmp', descriptor);
      await pm.getVersion();
      await pm.getVersion();

      expect(runCommandSpy).toHaveBeenCalledTimes(1);
    });

    it('should use the version provided in the constructor', async () => {
      const pm = new PackageManager(host, '/tmp', descriptor, { version: '4.5.6' });
      const version = await pm.getVersion();

      expect(version).toBe('4.5.6');
      expect(runCommandSpy).not.toHaveBeenCalled();
    });
  });
});
