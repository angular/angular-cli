/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import * as semver from 'semver';
import { PackageManager } from '../../../package-managers';
import { VERSION } from '../../../utilities/version';
import { ANGULAR_PACKAGES_REGEXP } from './constants';

/**
 * Coerces a string into a valid semantic version number.
 * @param version The version string to coerce.
 * @returns A valid semantic version string, or undefined if coercion fails.
 */
export function coerceVersionNumber(version: string | undefined): string | undefined {
  if (!version) {
    return undefined;
  }

  if (!/^\d{1,30}\.\d{1,30}\.\d{1,30}/.test(version)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);

    if (!match) {
      return undefined;
    }

    if (!match[1]) {
      version = version.substring(0, match[0].length) + '.0.0' + version.substring(match[0].length);
    } else if (!match[2]) {
      version = version.substring(0, match[0].length) + '.0' + version.substring(match[0].length);
    } else {
      return undefined;
    }
  }

  return semver.valid(version) ?? undefined;
}

/**
 * Checks if the installed CLI version is compatible with the packages being updated.
 * @param packagesToUpdate The list of packages being updated.
 * @param logger The logger instance.
 * @param packageManager The package manager instance.
 * @param verbose Whether to log verbose output.
 * @param next Whether to check for the next version.
 * @returns The version of the CLI to install, or null if the current version is compatible.
 */
export async function checkCLIVersion(
  packagesToUpdate: string[],
  logger: logging.LoggerApi,
  packageManager: PackageManager,
  next = false,
): Promise<string | null> {
  const runnerVersion = getCLIUpdateRunnerVersion(packagesToUpdate, next);
  const manifest = await packageManager.getManifest(`@angular/cli@${runnerVersion}`);

  if (!manifest) {
    logger.warn(`Could not find @angular/cli version '${runnerVersion}'.`);

    return null;
  }

  const version = manifest.version;

  return VERSION.full === version ? null : version;
}

/**
 * Determines the version of the CLI to use for the update process.
 * @param packagesToUpdate The list of packages being updated.
 * @param next Whether to use the next version.
 * @returns The version or tag to use for the CLI update runner.
 */
export function getCLIUpdateRunnerVersion(
  packagesToUpdate: string[] | undefined,
  next: boolean,
): string | number {
  if (next) {
    return 'next';
  }

  const updatingAngularPackage = packagesToUpdate?.find((r) => ANGULAR_PACKAGES_REGEXP.test(r));
  if (updatingAngularPackage) {
    // If we are updating any Angular package we can update the CLI to the target version because
    // migrations for @angular/core@13 can be executed using Angular/cli@13.
    // This is same behaviour as `npx @angular/cli@13 update @angular/core@13`.

    // `@angular/cli@13` -> ['', 'angular/cli', '13']
    // `@angular/cli` -> ['', 'angular/cli']
    const tempVersion = coerceVersionNumber(updatingAngularPackage.split('@')[2]);

    return semver.parse(tempVersion)?.major ?? 'latest';
  }

  // When not updating an Angular package we cannot determine which schematic runtime the migration should to be executed in.
  // Typically, we can assume that the `@angular/cli` was updated previously.
  // Example: Angular official packages are typically updated prior to NGRX etc...
  // Therefore, we only update to the latest patch version of the installed major version of the Angular CLI.

  // This is important because we might end up in a scenario where locally Angular v12 is installed, updating NGRX from 11 to 12.
  // We end up using Angular ClI v13 to run the migrations if we run the migrations using the CLI installed major version + 1 logic.
  return VERSION.major;
}

/**
 * Runs a binary from a temporary package installation.
 * @param packageName The name of the package to install and run.
 * @param packageManager The package manager instance.
 * @param args The arguments to pass to the binary.
 * @returns The exit code of the binary.
 */
export async function runTempBinary(
  packageName: string,
  packageManager: PackageManager,
  args: string[] = [],
): Promise<number> {
  const { workingDirectory, cleanup } = await packageManager.acquireTempPackage(packageName);

  try {
    // Remove version/tag etc... from package name
    // Ex: @angular/cli@latest -> @angular/cli
    const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
    const pkgLocation = join(workingDirectory, 'node_modules', packageNameNoVersion);
    const packageJsonPath = join(pkgLocation, 'package.json');

    // Get a binary location for this package
    let binPath: string | undefined;
    if (existsSync(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      if (content) {
        const { bin = {} } = JSON.parse(content) as { bin: Record<string, string> };
        const binKeys = Object.keys(bin);

        if (binKeys.length) {
          binPath = resolve(pkgLocation, bin[binKeys[0]]);
        }
      }
    }

    if (!binPath) {
      throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
    }

    const { status, error } = spawnSync(process.execPath, [binPath, ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NG_DISABLE_VERSION_CHECK: 'true',
        NG_CLI_ANALYTICS: 'false',
      },
    });

    if (status === null && error) {
      throw error;
    }

    return status ?? 0;
  } finally {
    await cleanup();
  }
}

/**
 * Determines whether to force the package manager to ignore peer dependency warnings.
 * @param packageManager The package manager instance.
 * @param logger The logger instance.
 * @param verbose Whether to log verbose output.
 * @returns True if the package manager should be forced, false otherwise.
 */
export async function shouldForcePackageManager(
  packageManager: PackageManager,
  logger: logging.LoggerApi,
  verbose: boolean,
): Promise<boolean> {
  // npm 7+ can fail due to it incorrectly resolving peer dependencies that have valid SemVer
  // ranges during an update. Update will set correct versions of dependencies within the
  // package.json file. The force option is set to workaround these errors.
  if (packageManager.name === 'npm') {
    const version = await packageManager.getVersion();
    if (semver.gte(version, '7.0.0')) {
      if (verbose) {
        logger.info('NPM 7+ detected -- enabling force option for package installation');
      }

      return true;
    }
  }

  return false;
}
