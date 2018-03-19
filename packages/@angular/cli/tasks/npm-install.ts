import { ModuleNotFoundException, resolve } from '@angular-devkit/core/node';

import chalk from 'chalk';
import { spawn } from 'child_process';
import { logging } from '@angular-devkit/core';


export type NpmInstall = (packageName: string,
                          logger: logging.Logger,
                          packageManager: string,
                          projectRoot: string,
                          save: boolean) => void;

export default async function (packageName: string,
                               logger: logging.Logger,
                               packageManager: string,
                               projectRoot: string,
                               save: boolean) {
  if (packageManager === 'default') {
    packageManager = 'npm';
  }

  logger.info(chalk.green(`Installing packages for tooling via ${packageManager}.`));

  const installArgs = ['install'];
  if (packageManager === 'npm') {
    installArgs.push('--quiet');
  }
  if (packageName) {
    try {
      // Verify if we need to install the package (it might already be there).
      // If it's available and we shouldn't save, simply return. Nothing to be done.
      resolve(packageName, { checkLocal: true, basedir: projectRoot });

      if (!save) {
        return;
      }
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
    shell: true
  };

  await new Promise((resolve, reject) => {
    spawn(packageManager, installArgs, installOptions)
      .on('close', (code: number) => {
        if (code === 0) {
          logger.info(chalk.green(`Installed packages for tooling via ${packageManager}.`));
          resolve();
        } else {
          const message = 'Package install failed, see above.';
          logger.info(chalk.red(message));
          reject(message);
        }
      });
  });
}
