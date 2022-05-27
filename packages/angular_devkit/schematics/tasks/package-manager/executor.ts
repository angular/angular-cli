/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import { SpawnOptions, spawn } from 'child_process';
import ora from 'ora';
import * as path from 'path';
import { Observable } from 'rxjs';
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
  'cnpm': {
    commands: {
      installAll: 'install',
      installPackage: 'install',
    },
  },
  'yarn': {
    commands: {
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
      shell: true,
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

    return new Observable((obs) => {
      const spinner = ora({
        text: `Installing packages (${taskPackageManagerName})...`,
        // Workaround for https://github.com/sindresorhus/ora/issues/136.
        discardStdin: process.platform != 'win32',
      }).start();
      const childProcess = spawn(taskPackageManagerName, args, spawnOptions).on(
        'close',
        (code: number) => {
          if (code === 0) {
            spinner.succeed('Packages installed successfully.');
            spinner.stop();
            obs.next();
            obs.complete();
          } else {
            if (options.hideOutput) {
              bufferedOutput.forEach(({ stream, data }) => stream.write(data));
            }
            spinner.fail('Package install failed, see above.');
            obs.error(new UnsuccessfulWorkflowExecution());
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
