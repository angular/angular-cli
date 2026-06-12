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

  describe('acquireTempPackage', () => {
    it('should copy and sanitize pnpm-workspace.yaml when package manager is pnpm and workspace file exists', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const testHost = new MockHost({ '/tmp/project/node_modules': true });
      const pm = new PackageManager(testHost, '/tmp/project', pnpmDescriptor);

      const createTempDirectorySpy = spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const mockWorkspaceContent = [
        'packages:',
        '  - .',
        '  - packages/*',
        'minimumReleaseAge: 1440',
        'minimumReleaseAgeExclude:',
        "  - '@angular/*'",
        'overrides:',
        "  '@angular/build': workspace:*",
        'packageExtensions:',
        '  vitest:',
        '    peerDependencies:',
        "      '@vitest/coverage-v8': '*'",
      ].join('\n');
      const readFileSpy = spyOn(testHost, 'readFile').and.resolveTo(mockWorkspaceContent);
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '', stderr: '' });

      const { workingDirectory } = await pm.acquireTempPackage('foo@1.0.0');

      expect(workingDirectory).toBe('/tmp/project/node_modules/angular-cli-tmp-packages-abc');
      expect(createTempDirectorySpy).toHaveBeenCalledWith('/tmp/project/node_modules');
      expect(readFileSpy).toHaveBeenCalledWith('/tmp/project/pnpm-workspace.yaml');

      const expectedSanitizedContent = [
        'packages:',
        "  - '.'",
        'minimumReleaseAge: 1440',
        'minimumReleaseAgeExclude:',
        "  - '@angular/*'",
        'packageExtensions:',
        '  vitest:',
        '    peerDependencies:',
        "      '@vitest/coverage-v8': '*'",
      ].join('\n');
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/pnpm-workspace.yaml',
        expectedSanitizedContent,
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        '{}',
      );
    });

    it('should write empty pnpm-workspace.yaml as fallback when package manager is pnpm and workspace file does not exist', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const testHost = new MockHost({ '/tmp/project/node_modules': true });
      const pm = new PackageManager(testHost, '/tmp/project', pnpmDescriptor);

      const createTempDirectorySpy = spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const readFileSpy = spyOn(testHost, 'readFile').and.throwError(
        new Error('ENOENT: no such file or directory'),
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '', stderr: '' });

      const { workingDirectory } = await pm.acquireTempPackage('foo@1.0.0');

      expect(workingDirectory).toBe('/tmp/project/node_modules/angular-cli-tmp-packages-abc');
      expect(createTempDirectorySpy).toHaveBeenCalledWith('/tmp/project/node_modules');
      expect(readFileSpy).toHaveBeenCalledWith('/tmp/project/pnpm-workspace.yaml');
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        '{}',
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/pnpm-workspace.yaml',
        "packages:\n  - '.'\n",
      );
    });

    it('should NOT write pnpm-workspace.yaml when package manager is npm', async () => {
      const npmDescriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];
      const testHost = new MockHost({ '/tmp/project/node_modules': true });
      const pm = new PackageManager(testHost, '/tmp/project', npmDescriptor);

      const createTempDirectorySpy = spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '', stderr: '' });

      const { workingDirectory } = await pm.acquireTempPackage('foo@1.0.0');

      expect(workingDirectory).toBe('/tmp/project/node_modules/angular-cli-tmp-packages-abc');
      expect(createTempDirectorySpy).toHaveBeenCalledWith('/tmp/project/node_modules');
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        '{}',
      );
      expect(writeFileSpy).not.toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/pnpm-workspace.yaml',
        '',
      );
    });
  });

  describe('getRegistryMetadata', () => {
    it('should query dist-tags and versions separately for bun', async () => {
      const bunDescriptor = SUPPORTED_PACKAGE_MANAGERS['bun'];
      const pm = new PackageManager(host, '/tmp', bunDescriptor);

      runCommandSpy.and.callFake((binary, args) => {
        if (args.includes('dist-tags')) {
          return Promise.resolve({ stdout: JSON.stringify({ latest: '2.0.0' }), stderr: '' });
        } else if (args.includes('versions')) {
          return Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']), stderr: '' });
        }

        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const metadata = await pm.getRegistryMetadata('foo');

      expect(metadata).toEqual({
        name: 'foo',
        'dist-tags': { latest: '2.0.0' },
        versions: ['1.0.0', '2.0.0'],
      });

      expect(runCommandSpy).toHaveBeenCalledWith(
        'bun',
        ['pm', 'view', '--json', 'foo', 'dist-tags'],
        jasmine.anything(),
      );
      expect(runCommandSpy).toHaveBeenCalledWith(
        'bun',
        ['pm', 'view', '--json', 'foo', 'versions'],
        jasmine.anything(),
      );
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
