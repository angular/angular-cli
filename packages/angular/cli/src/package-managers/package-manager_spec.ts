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

  describe('getManifest with min-release-age', () => {
    const MS_PER_DAY = 86_400_000;
    let now: number;

    beforeEach(() => {
      now = Date.parse('2026-05-15T12:00:00.000Z');
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(now));

      // Stub stat so the cooldown reader sees `/tmp` itself as the repo root.
      spyOn(host, 'stat').and.callFake((path: string) => {
        if (path === '/tmp/.git') {
          return Promise.resolve({ isDirectory: () => true } as never);
        }

        return Promise.reject(new Error('not found'));
      });
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    /**
     * Returns the metadata stdout the npm `view` parser expects, with one
     * version that is "old enough" and one that is too new for a cooldown
     * of 7 days.
     */
    function mockMetadataResponse(): void {
      const metadata = {
        name: 'foo',
        'dist-tags': { latest: '21.4.0' },
        versions: ['21.3.0', '21.4.0'],
        time: {
          // 21.3.0: 30 days ago (always old enough)
          '21.3.0': new Date(now - 30 * MS_PER_DAY).toISOString(),
          // 21.4.0: 1 day ago (younger than the 7-day cooldown)
          '21.4.0': new Date(now - 1 * MS_PER_DAY).toISOString(),
        },
      };

      runCommandSpy.and.callFake((_binary: string, args: readonly string[]) => {
        // Metadata requests are scoped to the package without a version (`foo`).
        // Manifest requests use a versioned specifier (`foo@<version>`).
        const versionedSpec = args.find((a) => /^foo@\S+/.test(a));
        if (!versionedSpec) {
          return Promise.resolve({ stdout: JSON.stringify(metadata), stderr: '' });
        }

        const requestedVersion = /^foo@(\S+)/.exec(versionedSpec)?.[1] ?? '';

        return Promise.resolve({
          stdout: JSON.stringify({ name: 'foo', version: requestedVersion }),
          stderr: '',
        });
      });
    }

    it('honors a cooldown configured in .npmrc when resolving the `latest` tag', async () => {
      spyOn(host, 'readFile').and.callFake((path: string) => {
        if (path === '/tmp/.npmrc') {
          return Promise.resolve('min-release-age=7\n');
        }

        return Promise.reject(new Error('not found'));
      });
      mockMetadataResponse();

      const pm = new PackageManager(host, '/tmp', descriptor);
      const manifest = await pm.getManifest('foo@latest');

      expect(manifest?.version).toBe('21.3.0');
    });

    it('returns null when an explicit version is younger than the cooldown', async () => {
      spyOn(host, 'readFile').and.callFake((path: string) => {
        if (path === '/tmp/.npmrc') {
          return Promise.resolve('min-release-age=7\n');
        }

        return Promise.reject(new Error('not found'));
      });
      mockMetadataResponse();

      const pm = new PackageManager(host, '/tmp', descriptor);
      const manifest = await pm.getManifest('foo@21.4.0');

      expect(manifest).toBeNull();
    });

    it('does not call `getRegistryMetadata` when no cooldown is configured', async () => {
      spyOn(host, 'readFile').and.rejectWith(new Error('no .npmrc'));
      runCommandSpy.and.resolveTo({
        stdout: JSON.stringify({ name: 'foo', version: '21.4.0' }),
        stderr: '',
      });

      const pm = new PackageManager(host, '/tmp', descriptor);
      const manifest = await pm.getManifest('foo@latest');

      expect(manifest?.version).toBe('21.4.0');
      // A single call: directly to `getRegistryManifest`. No metadata lookup.
      expect(runCommandSpy).toHaveBeenCalledTimes(1);
    });
  });
});
