/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { spawn } from 'child_process';
import { colors } from '../utilities/color';

export default async function(
  packageName: string,
  logger: logging.Logger,
  packageManager: string,
) {
  const installArgs: string[] = [];
  switch (packageManager) {
    case 'cnpm':
    case 'pnpm':
    case 'npm':
      installArgs.push('uninstall');
      break;

    case 'yarn':
      installArgs.push('remove');
      break;

    default:
      packageManager = 'npm';
      installArgs.push('uninstall');
      break;
  }

  installArgs.push(packageName, '--quiet');

  logger.info(colors.green(`Uninstalling packages for tooling via ${packageManager}.`));

  await new Promise((resolve, reject) => {
    spawn(packageManager, installArgs, { stdio: 'inherit', shell: true }).on(
      'close',
      (code: number) => {
        if (code === 0) {
          logger.info(colors.green(`Uninstalling packages for tooling via ${packageManager}.`));
          resolve();
        } else {
          reject('Package uninstallation failed, see above.');
        }
      },
    );
  });
}
