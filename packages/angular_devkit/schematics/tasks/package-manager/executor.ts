/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException } from '@angular-devkit/core';
import { SpawnOptions, spawn } from 'node:child_process';

/**
 * Escapes a single argument for safe use with Windows cmd.exe.
 * Prevents OS command injection (CWE-78) by wrapping in double quotes
 * and correctly escaping embedded quotes and backslashes.
 *
 * Algorithm: https://blogs.msdn.microsoft.com/twistylittlepassagesallalike/2011/04/23/
 */
function escapeArgForWindowsShell(arg: string): string {
  // FIX A: empty string must produce a quoted empty token.
  // Returning bare '' causes cmd.exe to drop the arg silently,
  // shifting all subsequent args by one (argument confusion).
  if (!arg) return '""';
  // Fast path: only shell-safe chars, no quoting needed
  if (/^[a-zA-Z0-9_\-./\\:@]+$/.test(arg)) {
    return arg;
  }
  // FIX B: escape % BEFORE wrapping in double-quotes.
  // cmd.exe expands %VAR% before evaluating quote context, so
  // %COMSPEC% inside "..." still expands (BatBadBut / CVE-2024-3566).
  // %% disables expansion and becomes a literal percent sign.
  arg = arg.replace(/%/g, '%%');
  let result = '"';
  let slashes = 0;
  for (const char of arg) {
    if (char === '\\') {
      slashes++;
    } else if (char === '"') {
      result += '\\'.repeat(slashes * 2 + 1) + '"';
      slashes = 0;
    } else {
      result += '\\'.repeat(slashes) + char;
      slashes = 0;
    }
  }
  result += '\\'.repeat(slashes * 2) + '"';
  return result;
}


import * as path from 'node:path';
import ora from 'ora';
import { TaskExecutor, UnsuccessfulWorkflowExecution } from '../../src';
import { NodePackageTaskFactoryOptions, NodePackageTaskOptions } from './options';

interface PackageManagerProfile {
  commands: {
    installAll?: string;
    installPackage: string;
  };
}

const packageManagers: { [name: string]: PackageManagerProfile } = {
  'npm': {
    commands: {
      installAll: 'install',
      installPackage: 'install',
    },
  },
  'yarn': {
    commands: {
      installAll: 'install',
      installPackage: 'add',
    },
  },
  'bun': {
    commands: {
      installAll: 'install',
      installPackage: 'add',
    },
  },
  'pnpm': {
    commands: {
      installAll: 'install',
      installPackage: 'install',
    },
  },
};

export class UnknownPackageManagerException extends BaseException {
  constructor(name: string) {
    super(`Unknown package manager "${name}".`);
  }
}

export default function (
  factoryOptions: NodePackageTaskFactoryOptions = {},
): TaskExecutor<NodePackageTaskOptions> {
  const packageManagerName = factoryOptions.packageManager || 'npm';
  const packageManagerProfile = packageManagers[packageManagerName];
  if (!packageManagerProfile) {
    throw new UnknownPackageManagerException(packageManagerName);
  }

  const rootDirectory = factoryOptions.rootDirectory || process.cwd();

  return (options: NodePackageTaskOptions = { command: 'install' }) => {
    let taskPackageManagerProfile = packageManagerProfile;
    let taskPackageManagerName = packageManagerName;
    if (factoryOptions.allowPackageManagerOverride && options.packageManager) {
      taskPackageManagerProfile = packageManagers[options.packageManager];
      if (!taskPackageManagerProfile) {
        throw new UnknownPackageManagerException(options.packageManager);
      }
      taskPackageManagerName = options.packageManager;
    }

    const bufferedOutput: { stream: NodeJS.WriteStream; data: Buffer }[] = [];
    const spawnOptions: SpawnOptions = {
      shell: false,
      cwd: path.join(rootDirectory, options.workingDirectory || ''),
    };
    if (options.hideOutput) {
      spawnOptions.stdio = options.quiet ? ['ignore', 'ignore', 'pipe'] : 'pipe';
    } else {
      spawnOptions.stdio = options.quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit';
    }

    const args: string[] = [];

    if (options.packageName) {
      if (options.command === 'install') {
        args.push(taskPackageManagerProfile.commands.installPackage);
      }
      args.push(options.packageName);
    } else if (options.command === 'install' && taskPackageManagerProfile.commands.installAll) {
      args.push(taskPackageManagerProfile.commands.installAll);
    }

    if (!options.allowScripts) {
      // Yarn requires special handling since Yarn 2+ no longer has the `--ignore-scripts` flag
      if (taskPackageManagerName === 'yarn') {
        spawnOptions.env = {
          ...process.env,
          // Supported with yarn 1
          'npm_config_ignore_scripts': 'true',
          // Supported with yarn 2+
          'YARN_ENABLE_SCRIPTS': 'false',
        };
      } else {
        args.push('--ignore-scripts');
      }
    }

    if (factoryOptions.registry) {
      args.push(`--registry="${factoryOptions.registry}"`);
    }

    if (factoryOptions.force) {
      args.push('--force');
    }

    return new Promise<void>((resolve, reject) => {
      const spinner = ora({
        text: `Installing packages (${taskPackageManagerName})...`,
        // Workaround for https://github.com/sindresorhus/ora/issues/136.
        discardStdin: process.platform != 'win32',
      }).start();
      // SECURITY FIX (CWE-78): never concatenate args as a raw shell string.
      // On Windows, package managers are .cmd scripts requiring a shell, but
      // instead of shell:true + string concat (injection vector), we invoke
      // cmd.exe directly with shell:false and pass each arg as an array element.
      // Node.js then controls quoting — metacharacters in args are never
      // interpreted by cmd.exe as shell operators.
      const isWin32 = process.platform === 'win32';
      const childProcess = isWin32
        ? spawn(
            'cmd.exe',
            ['/d', '/s', '/c', taskPackageManagerName, ...args],
            { ...spawnOptions, shell: false },
          ).on(
        : spawn(taskPackageManagerName, args, { ...spawnOptions, shell: false }).on(
        'close',
        (code: number) => {
          if (code === 0) {
            spinner.succeed('Packages installed successfully.');
            spinner.stop();
            resolve();
          } else {
            if (options.hideOutput) {
              bufferedOutput.forEach(({ stream, data }) => stream.write(data));
            }
            spinner.fail('Package install failed, see above.');
            reject(new UnsuccessfulWorkflowExecution());
          }
        },
      );
      if (options.hideOutput) {
        childProcess.stdout?.on('data', (data: Buffer) =>
          bufferedOutput.push({ stream: process.stdout, data: data }),
        );
        childProcess.stderr?.on('data', (data: Buffer) =>
          bufferedOutput.push({ stream: process.stderr, data: data }),
        );
      }
    });
  };
}
