/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isJsonObject, json } from '@angular-devkit/core';
import { execSync, spawn } from 'node:child_process';
import { promises as fs, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PackageManager } from '../../lib/config/workspace-schema';
import { AngularWorkspace, getProjectByCwd } from './config';
import { memoize } from './memoize';

/**
 * A map of package managers to their corresponding lockfile names.
 */
const LOCKFILE_NAMES: Readonly<Record<PackageManager, string | readonly string[]>> = {
  [PackageManager.Yarn]: 'yarn.lock',
  [PackageManager.Pnpm]: 'pnpm-lock.yaml',
  [PackageManager.Bun]: ['bun.lockb', 'bun.lock'],
  [PackageManager.Npm]: 'package-lock.json',
};

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

/**
 * Utilities for interacting with various package managers.
 */
export class PackageManagerUtils {
  /**
   * @param context The context for the package manager utilities, including workspace and global configuration.
   */
  constructor(private readonly context: PackageManagerUtilsContext) {}

  /** Get the package manager name. */
  get name(): PackageManager {
    return this.getName();
  }

  /** Get the package manager version. */
  get version(): string | undefined {
    return this.getVersion(this.name);
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
      case PackageManager.Bun:
        return {
          saveDev: '--development',
          install: 'add',
          installAll: 'install',
          prefix: '--cwd',
          noLockfile: '',
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

    return new Promise((resolve) => {
      const bufferedOutput: { stream: NodeJS.WriteStream; data: Buffer }[] = [];

      const childProcess = spawn(`${this.name} ${args.join(' ')}`, {
        // Always pipe stderr to allow for failures to be reported
        stdio: silent ? ['ignore', 'ignore', 'pipe'] : 'pipe',
        shell: true,
        cwd,
      }).on('close', (code: number) => {
        if (code === 0) {
          resolve(true);
        } else {
          bufferedOutput.forEach(({ stream, data }) => stream.write(data));
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

    const filesInRoot = readdirSync(this.context.root);

    const hasNpmLock = this.hasLockfile(PackageManager.Npm, filesInRoot);
    const hasYarnLock = this.hasLockfile(PackageManager.Yarn, filesInRoot);
    const hasPnpmLock = this.hasLockfile(PackageManager.Pnpm, filesInRoot);
    const hasBunLock = this.hasLockfile(PackageManager.Bun, filesInRoot);

    // PERF NOTE: `this.getVersion` spawns the package a the child_process which can take around ~300ms at times.
    // Therefore, we should only call this method when needed. IE: don't call `this.getVersion(PackageManager.Pnpm)` unless truly needed.
    // The result of this method is not stored in a variable because it's memoized.

    if (hasNpmLock) {
      // Has NPM lock file.
      if (!hasYarnLock && !hasPnpmLock && !hasBunLock && this.getVersion(PackageManager.Npm)) {
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
      } else if (hasBunLock && this.getVersion(PackageManager.Bun)) {
        // Bun lock file and Bun binary is available.
        return PackageManager.Bun;
      }
    }

    if (!this.getVersion(PackageManager.Npm)) {
      // Doesn't have NPM installed.
      const hasYarn = !!this.getVersion(PackageManager.Yarn);
      const hasPnpm = !!this.getVersion(PackageManager.Pnpm);
      const hasBun = !!this.getVersion(PackageManager.Bun);

      if (hasYarn && !hasPnpm && !hasBun) {
        return PackageManager.Yarn;
      } else if (hasPnpm && !hasYarn && !hasBun) {
        return PackageManager.Pnpm;
      } else if (hasBun && !hasYarn && !hasPnpm) {
        return PackageManager.Bun;
      }
    }

    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return PackageManager.Npm;
  }

  /**
   * Checks if a lockfile for a specific package manager exists in the root directory.
   * @param packageManager The package manager to check for.
   * @param filesInRoot An array of file names in the root directory.
   * @returns True if the lockfile exists, false otherwise.
   */
  private hasLockfile(packageManager: PackageManager, filesInRoot: string[]): boolean {
    const lockfiles = LOCKFILE_NAMES[packageManager];

    return typeof lockfiles === 'string'
      ? filesInRoot.includes(lockfiles)
      : lockfiles.some((lockfile) => filesInRoot.includes(lockfile));
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
