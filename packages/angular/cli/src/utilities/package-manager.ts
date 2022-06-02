/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isJsonObject, json } from '@angular-devkit/core';
import { execSync, spawn } from 'child_process';
import { existsSync, promises as fs, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { satisfies, valid } from 'semver';
import { PackageManager } from '../../lib/config/workspace-schema';
import { AngularWorkspace, getProjectByCwd } from './config';
import { memoize } from './memoize';
import { Spinner } from './spinner';

interface PackageManagerOptions {
  saveDev: string;
  install: string;
  installAll?: string;
  prefix: string;
  noLockfile: string;
}

export interface PackageManagerUtilsContext {
  globalConfiguration: AngularWorkspace;
  workspace?: AngularWorkspace;
  root: string;
}

export class PackageManagerUtils {
  constructor(private readonly context: PackageManagerUtilsContext) {}

  /** Get the package manager name. */
  get name(): PackageManager {
    return this.getName();
  }

  /** Get the package manager version. */
  get version(): string | undefined {
    return this.getVersion(this.name);
  }

  /**
   * Checks if the package manager is supported. If not, display a warning.
   */
  ensureCompatibility(): void {
    if (this.name !== PackageManager.Npm) {
      return;
    }

    try {
      const version = valid(this.version);
      if (!version) {
        return;
      }

      if (satisfies(version, '>=7 <7.5.6')) {
        // eslint-disable-next-line no-console
        console.warn(
          `npm version ${version} detected.` +
            ' When using npm 7 with the Angular CLI, npm version 7.5.6 or higher is recommended.',
        );
      }
    } catch {
      // npm is not installed.
    }
  }

  /** Install a single package. */
  async install(
    packageName: string,
    save: 'dependencies' | 'devDependencies' | true = true,
    extraArgs: string[] = [],
    cwd?: string,
  ): Promise<boolean> {
    const packageManagerArgs = this.getArguments();
    const installArgs: string[] = [packageManagerArgs.install, packageName];

    if (save === 'devDependencies') {
      installArgs.push(packageManagerArgs.saveDev);
    }

    return this.run([...installArgs, ...extraArgs], { cwd, silent: true });
  }

  /** Install all packages. */
  async installAll(extraArgs: string[] = [], cwd?: string): Promise<boolean> {
    const packageManagerArgs = this.getArguments();
    const installArgs: string[] = [];
    if (packageManagerArgs.installAll) {
      installArgs.push(packageManagerArgs.installAll);
    }

    return this.run([...installArgs, ...extraArgs], { cwd, silent: true });
  }

  /** Install a single package temporary. */
  async installTemp(
    packageName: string,
    extraArgs?: string[],
  ): Promise<{
    success: boolean;
    tempNodeModules: string;
  }> {
    const tempPath = await fs.mkdtemp(join(realpathSync(tmpdir()), 'angular-cli-packages-'));

    // clean up temp directory on process exit
    process.on('exit', () => {
      try {
        rmSync(tempPath, { recursive: true, maxRetries: 3 });
      } catch {}
    });

    // NPM will warn when a `package.json` is not found in the install directory
    // Example:
    // npm WARN enoent ENOENT: no such file or directory, open '/tmp/.ng-temp-packages-84Qi7y/package.json'
    // npm WARN .ng-temp-packages-84Qi7y No description
    // npm WARN .ng-temp-packages-84Qi7y No repository field.
    // npm WARN .ng-temp-packages-84Qi7y No license field.

    // While we can use `npm init -y` we will end up needing to update the 'package.json' anyways
    // because of missing fields.
    await fs.writeFile(
      join(tempPath, 'package.json'),
      JSON.stringify({
        name: 'temp-cli-install',
        description: 'temp-cli-install',
        repository: 'temp-cli-install',
        license: 'MIT',
      }),
    );

    // setup prefix/global modules path
    const packageManagerArgs = this.getArguments();
    const tempNodeModules = join(tempPath, 'node_modules');
    // Yarn will not append 'node_modules' to the path
    const prefixPath = this.name === PackageManager.Yarn ? tempNodeModules : tempPath;
    const installArgs: string[] = [
      ...(extraArgs ?? []),
      `${packageManagerArgs.prefix}="${prefixPath}"`,
      packageManagerArgs.noLockfile,
    ];

    return {
      success: await this.install(packageName, true, installArgs, tempPath),
      tempNodeModules,
    };
  }

  private getArguments(): PackageManagerOptions {
    switch (this.name) {
      case PackageManager.Yarn:
        return {
          saveDev: '--dev',
          install: 'add',
          prefix: '--modules-folder',
          noLockfile: '--no-lockfile',
        };
      case PackageManager.Pnpm:
        return {
          saveDev: '--save-dev',
          install: 'add',
          installAll: 'install',
          prefix: '--prefix',
          noLockfile: '--no-lockfile',
        };
      default:
        return {
          saveDev: '--save-dev',
          install: 'install',
          installAll: 'install',
          prefix: '--prefix',
          noLockfile: '--no-package-lock',
        };
    }
  }

  private async run(
    args: string[],
    options: { cwd?: string; silent?: boolean } = {},
  ): Promise<boolean> {
    const { cwd = process.cwd(), silent = false } = options;

    const spinner = new Spinner();
    spinner.start('Installing packages...');

    return new Promise((resolve) => {
      const bufferedOutput: { stream: NodeJS.WriteStream; data: Buffer }[] = [];

      const childProcess = spawn(this.name, args, {
        // Always pipe stderr to allow for failures to be reported
        stdio: silent ? ['ignore', 'ignore', 'pipe'] : 'pipe',
        shell: true,
        cwd,
      }).on('close', (code: number) => {
        if (code === 0) {
          spinner.succeed('Packages successfully installed.');
          resolve(true);
        } else {
          spinner.stop();
          bufferedOutput.forEach(({ stream, data }) => stream.write(data));
          spinner.fail('Packages installation failed, see above.');
          resolve(false);
        }
      });

      childProcess.stdout?.on('data', (data: Buffer) =>
        bufferedOutput.push({ stream: process.stdout, data: data }),
      );
      childProcess.stderr?.on('data', (data: Buffer) =>
        bufferedOutput.push({ stream: process.stderr, data: data }),
      );
    });
  }

  @memoize
  private getVersion(name: PackageManager): string | undefined {
    try {
      return execSync(`${name} --version`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        env: {
          ...process.env,
          //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
          NO_UPDATE_NOTIFIER: '1',
          NPM_CONFIG_UPDATE_NOTIFIER: 'false',
        },
      }).trim();
    } catch {
      return undefined;
    }
  }

  @memoize
  private getName(): PackageManager {
    const packageManager = this.getConfiguredPackageManager();
    if (packageManager) {
      return packageManager;
    }

    const hasNpmLock = this.hasLockfile(PackageManager.Npm);
    const hasYarnLock = this.hasLockfile(PackageManager.Yarn);
    const hasPnpmLock = this.hasLockfile(PackageManager.Pnpm);

    // PERF NOTE: `this.getVersion` spawns the package a the child_process which can take around ~300ms at times.
    // Therefore, we should only call this method when needed. IE: don't call `this.getVersion(PackageManager.Pnpm)` unless truly needed.
    // The result of this method is not stored in a variable because it's memoized.

    if (hasNpmLock) {
      // Has NPM lock file.
      if (!hasYarnLock && !hasPnpmLock && this.getVersion(PackageManager.Npm)) {
        // Only NPM lock file and NPM binary is available.
        return PackageManager.Npm;
      }
    } else {
      // No NPM lock file.
      if (hasYarnLock && this.getVersion(PackageManager.Yarn)) {
        // Yarn lock file and Yarn binary is available.
        return PackageManager.Yarn;
      } else if (hasPnpmLock && this.getVersion(PackageManager.Pnpm)) {
        // PNPM lock file and PNPM binary is available.
        return PackageManager.Pnpm;
      }
    }

    if (!this.getVersion(PackageManager.Npm)) {
      // Doesn't have NPM installed.
      const hasYarn = !!this.getVersion(PackageManager.Yarn);
      const hasPnpm = !!this.getVersion(PackageManager.Pnpm);

      if (hasYarn && !hasPnpm) {
        return PackageManager.Yarn;
      } else if (!hasYarn && hasPnpm) {
        return PackageManager.Pnpm;
      }
    }

    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return PackageManager.Npm;
  }

  private hasLockfile(packageManager: PackageManager): boolean {
    let lockfileName: string;
    switch (packageManager) {
      case PackageManager.Yarn:
        lockfileName = 'yarn.lock';
        break;
      case PackageManager.Pnpm:
        lockfileName = 'pnpm-lock.yaml';
        break;
      case PackageManager.Npm:
      default:
        lockfileName = 'package-lock.json';
        break;
    }

    return existsSync(join(this.context.root, lockfileName));
  }

  private getConfiguredPackageManager(): PackageManager | undefined {
    const getPackageManager = (source: json.JsonValue | undefined): PackageManager | undefined => {
      if (source && isJsonObject(source)) {
        const value = source['packageManager'];
        if (typeof value === 'string') {
          return value as PackageManager;
        }
      }

      return undefined;
    };

    let result: PackageManager | undefined;
    const { workspace: localWorkspace, globalConfiguration: globalWorkspace } = this.context;
    if (localWorkspace) {
      const project = getProjectByCwd(localWorkspace);
      if (project) {
        result = getPackageManager(localWorkspace.projects.get(project)?.extensions['cli']);
      }

      result ??= getPackageManager(localWorkspace.extensions['cli']);
    }

    if (!result) {
      result = getPackageManager(globalWorkspace.extensions['cli']);
    }

    return result;
  }
}
