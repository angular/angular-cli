/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { PackageManagerError } from './error';
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
    it('should return null when the fetched manifest does not match the requested version', async () => {
      // Modern yarn falls back to the latest version when the requested version does not exist.
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['yarn']);
      runCommandSpy.and.resolveTo({
        stdout: JSON.stringify({ name: 'foo', version: '2.0.0' }),
        stderr: '',
      });

      expect(await pm.getRegistryManifest('foo', '99.99.99')).toBeNull();
      expect(await pm.getRegistryManifest('foo', '^99.0.0')).toBeNull();
      expect(await pm.getRegistryManifest('foo', '^2.0.0')).toEqual(
        jasmine.objectContaining({ version: '2.0.0' }),
      );
    });

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

    it('should return null when bun pm view fails with No matching version found', async () => {
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['bun']);
      runCommandSpy.and.rejectWith(
        new PackageManagerError(
          'Process exited with code 1.',
          JSON.stringify({ error: 'No matching version found', version: 'foo@99.99.99' }),
          '',
          1,
        ),
      );

      expect(await pm.getRegistryManifest('foo', '99.99.99')).toBeNull();
    });

    it('should throw when bun pm view fails with an unrecognized JSON error', async () => {
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['bun']);
      runCommandSpy.and.rejectWith(
        new PackageManagerError(
          'Process exited with code 1.',
          JSON.stringify({ error: 'Authentication token not found' }),
          '',
          1,
        ),
      );

      await expectAsync(pm.getRegistryManifest('foo', '1.0.0')).toBeRejectedWithError(
        PackageManagerError,
        'Authentication token not found',
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
      expect(writeFileSpy).not.toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/yarn.lock',
        '',
      );
    });

    it('should copy and sanitize .yarnrc.yml when package manager is yarn and it exists', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const testHost = new MockHost({
        '/tmp/project/node_modules': true,
        '/tmp/project/.yarnrc.yml': [],
      });
      const pm = new PackageManager(testHost, '/tmp/project', yarnDescriptor);

      const createTempDirectorySpy = spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      const mockYarnRcContent = [
        'yarnPath: .yarn/releases/yarn-4.4.1.cjs',
        'nodeLinker: pnp',
        'customOption:',
        '  nodeLinker: pnp-nested',
        '  plugins:',
        '    - nested-plugin',
        'plugins:',
        '  - path: .yarn/plugins/@yarnpkg/plugin-typescript.cjs',
        '    spec: "@yarnpkg/plugin-typescript"',
        'npmRegistryServer: "https://registry.npmjs.org"',
      ].join('\n');

      spyOn(testHost, 'readFile').and.callFake(async (filePath) => {
        if (filePath.replace(/\\/g, '/').endsWith('.yarnrc.yml')) {
          return mockYarnRcContent;
        }
        if (filePath.replace(/\\/g, '/').endsWith('package.json')) {
          return JSON.stringify({ packageManager: 'yarn@4.4.1' });
        }
        throw new Error(`Unexpected readFile call for ${filePath}`);
      });
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '4.4.1', stderr: '' });

      const { workingDirectory } = await pm.acquireTempPackage('foo@1.0.0');

      expect(workingDirectory).toBe('/tmp/project/node_modules/angular-cli-tmp-packages-abc');
      expect(createTempDirectorySpy).toHaveBeenCalledWith('/tmp/project/node_modules');

      const expectedYarnRcContent = [
        'customOption:',
        '  nodeLinker: pnp-nested',
        '  plugins:',
        '    - nested-plugin',
        'npmRegistryServer: "https://registry.npmjs.org"',
        'nodeLinker: node-modules',
      ].join('\n');

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/yarn.lock',
        '',
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/.yarnrc.yml',
        expectedYarnRcContent,
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        JSON.stringify({ packageManager: 'yarn@4.4.1' }, null, 2),
      );
    });

    it('should write empty yarn.lock and default .yarnrc.yml when package manager is yarn and config does not exist', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const testHost = new MockHost({
        '/tmp/project/node_modules': true,
      });
      const pm = new PackageManager(testHost, '/tmp/project', yarnDescriptor);

      const createTempDirectorySpy = spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();

      spyOn(testHost, 'readFile').and.callFake(async (filePath) => {
        if (filePath.replace(/\\/g, '/').endsWith('package.json')) {
          return JSON.stringify({ packageManager: 'yarn@4.4.1' });
        }
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      });
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '4.4.1', stderr: '' });

      const { workingDirectory } = await pm.acquireTempPackage('foo@1.0.0');

      expect(workingDirectory).toBe('/tmp/project/node_modules/angular-cli-tmp-packages-abc');
      expect(createTempDirectorySpy).toHaveBeenCalledWith('/tmp/project/node_modules');

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/yarn.lock',
        '',
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/.yarnrc.yml',
        'nodeLinker: node-modules\n',
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        JSON.stringify({ packageManager: 'yarn@4.4.1' }, null, 2),
      );
    });

    it('should copy packageManager field to temp package.json if version is resolved', async () => {
      const npmDescriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];
      const testHost = new MockHost({
        '/tmp/project/node_modules': true,
      });
      const pm = new PackageManager(testHost, '/tmp/project', npmDescriptor);

      spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '10.32.1', stderr: '' });

      await pm.acquireTempPackage('foo@1.0.0');

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        JSON.stringify({ packageManager: 'npm@10.32.1' }, null, 2),
      );
    });

    it('should write empty package.json if package manager version cannot be resolved', async () => {
      const npmDescriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];
      const testHost = new MockHost({ '/tmp/project/node_modules': true });
      const pm = new PackageManager(testHost, '/tmp/project', npmDescriptor);

      spyOn(testHost, 'createTempDirectory').and.resolveTo(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc',
      );
      const writeFileSpy = spyOn(testHost, 'writeFile').and.resolveTo();
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '', stderr: '' });

      await pm.acquireTempPackage('foo@1.0.0');

      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/project/node_modules/angular-cli-tmp-packages-abc/package.json',
        '{}',
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

    it('should return null when bun pm view fails with 404 Not Found', async () => {
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['bun']);
      runCommandSpy.and.rejectWith(
        new PackageManagerError(
          'Process exited with code 1.',
          '',
          "404 Not Found: https://registry.npmjs.org/non-existent\n\n - 'non-existent@latest' does not exist in this registry",
          1,
        ),
      );

      expect(await pm.getRegistryMetadata('non-existent')).toBeNull();
    });

    it('should return null when yarn npm info fails with a missing package', async () => {
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['yarn']);
      runCommandSpy.and.rejectWith(
        new PackageManagerError(
          'Process exited with code 1.',
          [
            '{"type":"error","name":35,"displayName":"YN0035","indent":"","data":"Package not found"}',
            '{"type":"error","name":35,"displayName":"YN0035","indent":"","data":"  Response Code: 404 (Not Found)"}',
          ].join('\n'),
          '',
          1,
        ),
      );

      expect(await pm.getRegistryMetadata('non-existent')).toBeNull();
    });
  });

  describe('getCurrentPackageName', () => {
    it('should return the name from package.json without running the package manager command', async () => {
      const pm = new PackageManager(host, '/repo/app', descriptor);
      const readFileSpy = spyOn(host, 'readFile').and.resolveTo('{"name": "app"}');

      expect(await pm.getCurrentPackageName()).toBe('app');
      expect(readFileSpy).toHaveBeenCalledWith(jasmine.stringMatching(/package\.json$/));
      expect(runCommandSpy).not.toHaveBeenCalled();
    });

    it('should fall back to the package manager command when reading package.json fails', async () => {
      const pm = new PackageManager(host, '/repo/app/src', descriptor);
      spyOn(host, 'readFile').and.rejectWith(new Error('ENOENT'));
      runCommandSpy.and.resolveTo({ stdout: '"app"', stderr: '' });

      expect(await pm.getCurrentPackageName()).toBe('app');
      expect(runCommandSpy).toHaveBeenCalledWith(
        descriptor.binary,
        descriptor.getPackageNameCommand,
        jasmine.objectContaining({ cwd: '/repo/app/src' }),
      );
    });

    it('should extract the package name when npm prints a single-entry workspace object', async () => {
      const pm = new PackageManager(host, '/repo/apps/app/src', descriptor);
      spyOn(host, 'readFile').and.rejectWith(new Error('ENOENT'));
      // Inside a workspace member, `npm pkg get name` prints `{ "app": "app" }` instead of `"app"`.
      runCommandSpy.and.resolveTo({ stdout: '{\n  "app": "app"\n}', stderr: '' });

      expect(await pm.getCurrentPackageName()).toBe('app');
    });

    it('should return undefined when npm prints multiple workspace entries and package.json is unavailable', async () => {
      const pm = new PackageManager(host, '/repo', descriptor);
      spyOn(host, 'readFile').and.rejectWith(new Error('ENOENT'));
      runCommandSpy.and.resolveTo({
        stdout: '{\n  "app-a": "app-a",\n  "app-b": "app-b"\n}',
        stderr: '',
      });

      expect(await pm.getCurrentPackageName()).toBeUndefined();
    });

    it('should fall back to bun pm pkg get name when package.json cannot be read', async () => {
      const pm = new PackageManager(host, '/repo/apps/app/src', SUPPORTED_PACKAGE_MANAGERS['bun']);
      spyOn(host, 'readFile').and.rejectWith(new Error('ENOENT'));
      runCommandSpy.and.resolveTo({ stdout: '"my-bun-app"', stderr: '' });

      expect(await pm.getCurrentPackageName()).toBe('my-bun-app');
      expect(runCommandSpy).toHaveBeenCalledWith(
        'bun',
        ['pm', 'pkg', 'get', 'name'],
        jasmine.objectContaining({ cwd: '/repo/apps/app/src' }),
      );
    });
  });

  describe('getProjectDependencies', () => {
    it('should list the dependencies of an npm workspace member', async () => {
      const pm = new PackageManager(host, '/repo/apps/app', descriptor);
      runCommandSpy.and.resolveTo({
        stdout: JSON.stringify({
          name: 'monorepo',
          dependencies: {
            app: {
              version: '0.0.0',
              resolved: 'file:../apps/app',
              dependencies: { '@angular/core': { version: '22.0.0' } },
            },
          },
        }),
        stderr: '',
      });
      spyOn(host, 'readFile').and.resolveTo('{"name": "app"}');

      const dependencies = await pm.getProjectDependencies();

      expect([...dependencies.keys()]).toEqual(['@angular/core']);
      expect(dependencies.get('@angular/core')?.version).toBe('22.0.0');
    });

    it('should resolve dependencies of a bun workspace member from local and hoisted node_modules', async () => {
      const testHost = new MockHost({
        '/outside/node_modules': true,
        '/outside/repo/bun.lock': [],
        '/outside/repo/node_modules': true,
        '/outside/repo/apps/app/node_modules': true,
      });
      const pm = new PackageManager(
        testHost,
        '/outside/repo/apps/app',
        SUPPORTED_PACKAGE_MANAGERS['bun'],
      );
      spyOn(testHost, 'runCommand').and.resolveTo({
        stdout: [
          '/outside/repo node_modules (350)',
          '├── app@workspace:apps/app',
          '├── prettier@3.5.0',
          '└── typescript@5.9.3',
        ].join('\n'),
        stderr: '',
      });

      const files: Record<string, string> = {
        '/outside/repo/apps/app/package.json': JSON.stringify({
          name: 'app',
          dependencies: {
            '@angular/core': '^21.2.0',
            '@repo/shared': 'workspace:*',
            'uninstalled-pkg': '^1.0.0',
          },
          devDependencies: {
            '@angular/cli': '^21.2.0',
            typescript: '~5.8.0',
          },
        }),
        '/outside/repo/node_modules/@angular/core/package.json': JSON.stringify({
          name: '@angular/core',
          version: '21.2.4',
        }),
        '/outside/repo/node_modules/@angular/cli/package.json': JSON.stringify({
          name: '@angular/cli',
          version: '21.2.5',
        }),
        '/outside/repo/apps/app/node_modules/typescript/package.json': JSON.stringify({
          name: 'typescript',
          version: '5.8.3',
        }),
        '/outside/repo/node_modules/typescript/package.json': JSON.stringify({
          name: 'typescript',
          version: '5.9.3',
        }),
        '/outside/node_modules/uninstalled-pkg/package.json': JSON.stringify({
          name: 'uninstalled-pkg',
          version: '1.0.0',
        }),
      };

      const readFileSpy = spyOn(testHost, 'readFile').and.callFake(async (filePath: string) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized in files) {
          return files[normalized];
        }
        throw new Error(`ENOENT: ${filePath}`);
      });

      const dependencies = await pm.getProjectDependencies();

      expect(dependencies.has('app')).toBeFalse();
      expect(dependencies.has('@repo/shared')).toBeFalse();
      // Should stop searching at the workspace root (bun.lock) and not resolve from /outside/node_modules
      expect(dependencies.has('uninstalled-pkg')).toBeFalse();
      expect(readFileSpy).not.toHaveBeenCalledWith(
        jasmine.stringMatching(/\/outside\/node_modules\//),
      );
      expect(dependencies.get('prettier')).toEqual({ name: 'prettier', version: '3.5.0' });
      expect(dependencies.get('@angular/core')).toEqual({
        name: '@angular/core',
        version: '21.2.4',
        path: '/outside/repo/node_modules/@angular/core',
      });
      expect(dependencies.get('@angular/cli')).toEqual({
        name: '@angular/cli',
        version: '21.2.5',
        path: '/outside/repo/node_modules/@angular/cli',
      });
      expect(dependencies.get('typescript')).toEqual({
        name: 'typescript',
        version: '5.8.3',
        path: '/outside/repo/apps/app/node_modules/typescript',
      });
    });

    it('should stop searching for node_modules at a git root where .git is a file', async () => {
      const testHost = new MockHost({
        '/outside/node_modules': true,
        // A `.git` file is used by git worktrees and submodules.
        '/outside/repo/.git': [],
        '/outside/repo/apps/app/node_modules': true,
      });
      const pm = new PackageManager(
        testHost,
        '/outside/repo/apps/app',
        SUPPORTED_PACKAGE_MANAGERS['bun'],
      );
      spyOn(testHost, 'runCommand').and.resolveTo({ stdout: '', stderr: '' });

      const files: Record<string, string> = {
        '/outside/repo/apps/app/package.json': JSON.stringify({
          name: 'app',
          dependencies: {
            'local-pkg': '^1.0.0',
            'outside-pkg': '^1.0.0',
          },
        }),
        '/outside/repo/apps/app/node_modules/local-pkg/package.json': JSON.stringify({
          name: 'local-pkg',
          version: '1.2.3',
        }),
        '/outside/node_modules/outside-pkg/package.json': JSON.stringify({
          name: 'outside-pkg',
          version: '1.0.0',
        }),
      };

      spyOn(testHost, 'readFile').and.callFake(async (filePath: string) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized in files) {
          return files[normalized];
        }
        throw new Error(`ENOENT: ${filePath}`);
      });

      const dependencies = await pm.getProjectDependencies();

      expect(dependencies.get('local-pkg')?.version).toBe('1.2.3');
      expect(dependencies.has('outside-pkg')).toBeFalse();
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

  describe('getMinimumReleaseAge', () => {
    it('should return 0 when the package manager descriptor does not support getReleaseAgeConfigCommand', async () => {
      const pm = new PackageManager(host, '/tmp', SUPPORTED_PACKAGE_MANAGERS['bun']);
      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(0);
    });

    it('should query release age configuration value and parse npm before date parameter correctly', async () => {
      const npmDescriptor = SUPPORTED_PACKAGE_MANAGERS['npm'];
      const pm = new PackageManager(host, '/tmp', npmDescriptor);
      const testDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '10.8.0', stderr: '' });
        }
        if (args.includes('before')) {
          return Promise.resolve({ stdout: testDate, stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      // Allow +/- 2000ms variance due to Date.now() timing difference between mock and execution.
      expect(age).toBeGreaterThanOrEqual(10 * 24 * 60 * 60 * 1000 - 2000);
      expect(age).toBeLessThanOrEqual(10 * 24 * 60 * 60 * 1000 + 2000);
      expect(runCommandSpy).toHaveBeenCalledWith(
        'npm',
        ['config', 'get', 'before'],
        jasmine.anything(),
      );
    });

    it('should query release age configuration value and parse pnpm minutes value correctly', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const pm = new PackageManager(host, '/tmp', pnpmDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '10.15.0', stderr: '' });
        }
        if (args.includes('minimum-release-age')) {
          return Promise.resolve({ stdout: '1440', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(1440 * 60 * 1000);
      expect(runCommandSpy).toHaveBeenCalledWith(
        'pnpm',
        ['config', 'get', 'minimum-release-age'],
        jasmine.anything(),
      );
    });

    it('should query release age configuration value and parse yarn duration values correctly', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const pm = new PackageManager(host, '/tmp', yarnDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '4.5.0', stderr: '' });
        }
        if (args.includes('npmMinimalAgeGate')) {
          return Promise.resolve({ stdout: '3d', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(3 * 24 * 60 * 60 * 1000);
      expect(runCommandSpy).toHaveBeenCalledWith(
        'yarn',
        ['config', 'get', 'npmMinimalAgeGate'],
        jasmine.anything(),
      );
    });

    it('should query yarn configuration value and parse raw numbers as minutes', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const pm = new PackageManager(host, '/tmp', yarnDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '4.5.0', stderr: '' });
        }
        if (args.includes('npmMinimalAgeGate')) {
          return Promise.resolve({ stdout: '3', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(3 * 60 * 1000);
    });

    it('should cache the release age after the first fetch', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const pm = new PackageManager(host, '/tmp', pnpmDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '10.15.0', stderr: '' });
        }
        if (args.includes('minimum-release-age')) {
          return Promise.resolve({ stdout: '1440', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age1 = await pm.getMinimumReleaseAge();
      const age2 = await pm.getMinimumReleaseAge();

      expect(age1).toBe(1440 * 60 * 1000);
      expect(age2).toBe(1440 * 60 * 1000);
      expect(runCommandSpy).toHaveBeenCalledTimes(2);
    });

    it('should default to 1440 minutes for pnpm v11+ when config is not specified', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const pm = new PackageManager(host, '/tmp', pnpmDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('minimum-release-age')) {
          return Promise.resolve({ stdout: 'undefined', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '11.2.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(1440 * 60 * 1000);
    });

    it('should default to 0 for pnpm v10 when config is not specified', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const pm = new PackageManager(host, '/tmp', pnpmDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('minimum-release-age')) {
          return Promise.resolve({ stdout: 'undefined', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '10.15.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(0);
    });

    it('should respect explicitly configured 0 value for pnpm v11+', async () => {
      const pnpmDescriptor = SUPPORTED_PACKAGE_MANAGERS['pnpm'];
      const pm = new PackageManager(host, '/tmp', pnpmDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('minimum-release-age')) {
          return Promise.resolve({ stdout: '0', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '11.2.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(0);
    });

    it('should default to 1440 minutes for yarn v4+ when config is not specified', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const pm = new PackageManager(host, '/tmp', yarnDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('npmMinimalAgeGate')) {
          return Promise.resolve({ stdout: 'undefined', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '4.1.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(1440 * 60 * 1000);
    });

    it('should default to 0 for yarn v3 when config is not specified', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const pm = new PackageManager(host, '/tmp', yarnDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('npmMinimalAgeGate')) {
          return Promise.resolve({ stdout: 'undefined', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '3.6.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(0);
    });

    it('should respect explicitly configured 0 value for yarn v4+', async () => {
      const yarnDescriptor = SUPPORTED_PACKAGE_MANAGERS['yarn'];
      const pm = new PackageManager(host, '/tmp', yarnDescriptor);
      runCommandSpy.and.callFake((binary: string, args: readonly string[]) => {
        if (args.includes('npmMinimalAgeGate')) {
          return Promise.resolve({ stdout: '0', stderr: '' });
        }
        if (args.includes('--version')) {
          return Promise.resolve({ stdout: '4.1.0', stderr: '' });
        }

        return Promise.reject(new Error('Unknown command'));
      });

      const age = await pm.getMinimumReleaseAge();
      expect(age).toBe(0);
    });
  });
});
