/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, terminal } from '@angular-devkit/core';
import { ModuleNotFoundException, resolve } from '@angular-devkit/core/node';
import { spawn } from 'child_process';


export type NpmInstall = (packageName: string,
                          logger: logging.Logger,
                          packageManager: string,
                          projectRoot: string,
                          save?: boolean) => void;

export default async function (packageName: string,
                               logger: logging.Logger,
                               packageManager: string,
                               projectRoot: string,
                               save = true) {
  const installArgs: string[] = [];
  switch (packageManager) {
    case 'cnpm':
    case 'npm':
      installArgs.push('install', '--quiet');
      break;

    case 'yarn':
      installArgs.push('add');
      break;

    default:
      packageManager = 'npm';
      installArgs.push('install', '--quiet');
      break;
  }

  logger.info(terminal.green(`Installing packages for tooling via ${packageManager}.`));

  if (packageName) {
    try {
      // Verify if we need to install the package (it might already be there).
      // If it's available and we shouldn't save, simply return. Nothing to be done.
      resolve(packageName, { checkLocal: true, basedir: projectRoot });

      return;
    } catch (e) {
      if (!(e instanceof ModuleNotFoundException)) {
        throw e;
      }
    }
    installArgs.push(packageName);
  }

  if (!save) {
    installArgs.push('--no-save');
  }
  const installOptions = {
    stdio: 'inherit',
    shell: true,
  };

  await new Promise((resolve, reject) => {
    spawn(packageManager, installArgs, installOptions)
      .on('close', (code: number) => {
        if (code === 0) {
          logger.info(terminal.green(`Installed packages for tooling via ${packageManager}.`));
          resolve();
        } else {
          const message = 'Package install failed, see above.';
          logger.info(terminal.red(message));
          reject(message);
        }
      });
  });
}
