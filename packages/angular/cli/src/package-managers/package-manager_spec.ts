/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { MANIFEST_FIELDS, PackageManager } from './package-manager';
import { SUPPORTED_PACKAGE_MANAGERS } from './package-manager-descriptor';
import { MockHost } from './testing/mock-host';

describe('PackageManager', () => {
  let host: MockHost;
  let runCommandSpy: jasmine.Spy;
  const descriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];

  beforeEach(() => {
    host = new MockHost();
    runCommandSpy = spyOn(host, 'runCommand').and.resolveTo({ stdout: '1.2.3', stderr: '' });
  });

  describe('getRegistryManifest', () => {
    it('should quote complex range specifiers when required by the host', async () => {
      // Simulate a quoting host
      Object.assign(host, { requiresQuoting: true });

      const pm = new PackageManager(host, '/tmp', descriptor);
      const manifest = { name: 'foo', version: '1.0.0' };
      runCommandSpy.and.resolveTo({ stdout: JSON.stringify(manifest), stderr: '' });

      await pm.getRegistryManifest('foo', '>=1.0.0 <2.0.0');

      expect(runCommandSpy).toHaveBeenCalledWith(
        descriptor.binary,
        [...descriptor.getManifestCommand, '"foo@>=1.0.0 <2.0.0"', ...MANIFEST_FIELDS],
        jasmine.anything(),
      );
    });

    it('should NOT quote complex range specifiers when not required by the host', async () => {
      // Simulate a non-quoting host
      Object.assign(host, { requiresQuoting: false });

      const pm = new PackageManager(host, '/tmp', descriptor);
      const manifest = { name: 'foo', version: '1.0.0' };
      runCommandSpy.and.resolveTo({ stdout: JSON.stringify(manifest), stderr: '' });

      await pm.getRegistryManifest('foo', '>=1.0.0 <2.0.0');

      expect(runCommandSpy).toHaveBeenCalledWith(
        descriptor.binary,
        [...descriptor.getManifestCommand, 'foo@>=1.0.0 <2.0.0', ...MANIFEST_FIELDS],
        jasmine.anything(),
      );
    });
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

  describe('initializationError', () => {
    it('should throw initializationError when running commands', async () => {
      const error = new Error('Not installed');
      const pm = new PackageManager(host, '/tmp', descriptor, { initializationError: error });

      expect(() => pm.ensureInstalled()).toThrow(error);
      await expectAsync(pm.getVersion()).toBeRejectedWith(error);
      await expectAsync(pm.install()).toBeRejectedWith(error);
      await expectAsync(pm.add('foo', 'none', false, false, false)).toBeRejectedWith(error);
    });

    it('should not throw initializationError for operations that do not require the binary', async () => {
      const error = new Error('Not installed');
      const pm = new PackageManager(host, '/tmp', descriptor, { initializationError: error });

      // Mock readFile for getManifest directory case
      spyOn(host, 'readFile').and.resolveTo('{"name": "foo", "version": "1.0.0"}');

      // Should not throw
      const manifest = await pm.getManifest({
        type: 'directory',
        fetchSpec: '/tmp/foo',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      expect(manifest).toEqual({ name: 'foo', version: '1.0.0' });
    });
  });
});
