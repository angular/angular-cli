/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import * as rimraf from 'rimraf';
import { PackageManager } from '../lib/config/schema';
import { colors } from '../utilities/color';
import { NgAddSaveDepedency } from '../utilities/package-metadata';

interface PackageManagerOptions {
  silent: string;
  saveDev: string;
  install: string;
  prefix: string;
}

export function installPackage(
  packageName: string,
  logger: logging.Logger,
  packageManager: PackageManager = PackageManager.Npm,
  save: Exclude<NgAddSaveDepedency, false> = true,
  extraArgs: string[] = [],
  global = false,
) {
  const packageManagerArgs = getPackageManagerArguments(packageManager);

  const installArgs: string[] = [
    packageManagerArgs.install,
    packageName,
    packageManagerArgs.silent,
  ];

  logger.info(colors.green(`Installing packages for tooling via ${packageManager}.`));

  if (save === 'devDependencies') {
    installArgs.push(packageManagerArgs.saveDev);
  }

  if (global) {
    if (packageManager === PackageManager.Yarn) {
      installArgs.unshift('global');
    } else {
      installArgs.push('--global');
    }
  }

  const { status } = spawnSync(
    packageManager,
    [
      ...installArgs,
      ...extraArgs,
    ],
    {
      stdio: 'inherit',
      shell: true,
    },
  );

  if (status !== 0) {
    throw new Error('Package install failed, see above.');
  }

  logger.info(colors.green(`Installed packages for tooling via ${packageManager}.`));
}

export function installTempPackage(
  packageName: string,
  logger: logging.Logger,
  packageManager: PackageManager = PackageManager.Npm,
): string {
  const tempPath = mkdtempSync(join(realpathSync(tmpdir()), '.ng-temp-packages-'));

  // clean up temp directory on process exit
  process.on('exit', () => rimraf.sync(tempPath));

  // setup prefix/global modules path
  const packageManagerArgs = getPackageManagerArguments(packageManager);
  const installArgs: string[] = [
    packageManagerArgs.prefix,
    tempPath,
  ];

  installPackage(packageName, logger, packageManager, true, installArgs, true);

  let tempNodeModules: string;
  if (packageManager !== PackageManager.Yarn && process.platform !== 'win32') {
    // Global installs on Unix systems go to {prefix}/lib/node_modules.
    // Global installs on Windows go to {prefix}/node_modules (that is, no lib folder.)
    tempNodeModules = join(tempPath, 'lib', 'node_modules');
  } else {
    tempNodeModules = join(tempPath, 'node_modules');
  }

  // Needed to resolve schematics from this location since we use a custom
  // resolve strategy in '@angular/devkit-core/node'
  // todo: this should be removed when we change the resolutions to use require.resolve
  process.env.NG_TEMP_MODULES_DIR = tempNodeModules;

  return tempNodeModules;
}

export function runTempPackageBin(
  packageName: string,
  logger: logging.Logger,
  packageManager: PackageManager = PackageManager.Npm,
  args: string[] = [],
): number {
  const tempNodeModulesPath = installTempPackage(packageName, logger, packageManager);

  // Remove version/tag etc... from package name
  // Ex: @angular/cli@latest -> @angular/cli
  const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
  const pkgLocation = join(tempNodeModulesPath, packageNameNoVersion);
  const packageJsonPath = join(pkgLocation, 'package.json');

  // Get a binary location for this package
  let binPath: string | undefined;
  if (existsSync(packageJsonPath)) {
    const content = readFileSync(packageJsonPath, 'utf-8');
    if (content) {
      const { bin = {} } = JSON.parse(content);
      const binKeys = Object.keys(bin);

      if (binKeys.length) {
        binPath = resolve(pkgLocation, bin[binKeys[0]]);
      }
    }
  }

  if (!binPath) {
    throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
  }

  const argv = [
    binPath,
    ...args,
  ];

  const { status, error } = spawnSync('node', argv, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NG_DISABLE_VERSION_CHECK: 'true',
    },
  });

  if (status === null && error) {
    throw error;
  }

  return status || 0;
}

function getPackageManagerArguments(packageManager: PackageManager): PackageManagerOptions {
  return packageManager === PackageManager.Yarn
    ? {
      silent: '--silent',
      saveDev: '--dev',
      install: 'add',
      prefix: '--global-folder',
    }
    : {
      silent: '--quiet',
      saveDev: '--save-dev',
      install: 'install',
      prefix: '--prefix',
    };
}
