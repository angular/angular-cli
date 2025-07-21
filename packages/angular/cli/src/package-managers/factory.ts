/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { major } from 'semver';
import { discover } from './discovery';
import { Host, NodeJS_HOST } from './host';
import { Logger } from './logger';
import { PackageManager } from './package-manager';
import { PackageManagerName, SUPPORTED_PACKAGE_MANAGERS } from './package-manager-descriptor';

/**
 * The default package manager to use when none is discovered or configured.
 */
const DEFAULT_PACKAGE_MANAGER: PackageManagerName = 'npm';

/**
 * Gets the version of yarn installed on the system.
 * @param host A `Host` instance for running commands.
 * @param cwd The absolute path to the working directory.
 * @param logger An optional logger instance.
 * @returns A promise that resolves to the yarn version string, or null if yarn is not installed.
 */
async function getYarnVersion(host: Host, cwd: string, logger?: Logger): Promise<string | null> {
  logger?.debug(`Getting yarn version...`);

  try {
    const { stdout } = await host.runCommand('yarn', ['--version'], { cwd });
    const version = stdout.trim();
    logger?.debug(`Yarn version is '${version}'.`);

    return version;
  } catch (e) {
    logger?.debug('Failed to get yarn version.');

    return null;
  }
}

/**
 * Determines the package manager to use for a given project.
 *
 * This function will determine the package manager by checking for a configured
 * package manager, discovering the package manager from lockfiles, or falling
 * back to a default. It also handles differentiation between yarn classic and modern.
 *
 * @param host A `Host` instance for interacting with the file system and running commands.
 * @param cwd The directory to start the search from.
 * @param configured An optional, explicitly configured package manager.
 * @param logger An optional logger instance.
 * @returns A promise that resolves to an object containing the name and source of the package manager.
 */
async function determinePackageManager(
  host: Host,
  cwd: string,
  configured?: PackageManagerName,
  logger?: Logger,
  dryRun?: boolean,
): Promise<{ name: PackageManagerName; source: 'configured' | 'discovered' | 'default' }> {
  let name: PackageManagerName;
  let source: 'configured' | 'discovered' | 'default';

  if (configured) {
    name = configured;
    source = 'configured';
    logger?.debug(`Using configured package manager: '${name}'.`);
  } else {
    const discovered = await discover(host, cwd, logger);
    if (discovered) {
      name = discovered;
      source = 'discovered';
      logger?.debug(`Discovered package manager: '${name}'.`);
    } else {
      name = DEFAULT_PACKAGE_MANAGER;
      source = 'default';
      logger?.debug(
        `No lockfile found. Using default package manager: '${DEFAULT_PACKAGE_MANAGER}'.`,
      );
    }
  }

  if (name === 'yarn' && !dryRun) {
    const version = await getYarnVersion(host, cwd, logger);
    if (version && major(version) < 2) {
      name = 'yarn-classic';
      logger?.debug(`Detected yarn classic. Using 'yarn-classic'.`);
    }
  } else if (name === 'yarn') {
    logger?.debug('Skipping yarn version check due to dry run. Assuming modern yarn.');
  }

  return { name, source };
}

/**
 * Creates a new `PackageManager` instance for a given project.
 *
 * This function is the main entry point for the package manager abstraction.
 * It will determine, verify, and instantiate the correct package manager.
 *
 * @param options An object containing the options for creating the package manager.
 * @returns A promise that resolves to a new `PackageManager` instance.
 */
export async function createPackageManager(options: {
  cwd: string;
  configuredPackageManager?: PackageManagerName;
  logger?: Logger;
  dryRun?: boolean;
}): Promise<PackageManager> {
  const { cwd, configuredPackageManager, logger, dryRun } = options;
  const host = NodeJS_HOST;

  const { name, source } = await determinePackageManager(
    host,
    cwd,
    configuredPackageManager,
    logger,
    dryRun,
  );

  const descriptor = SUPPORTED_PACKAGE_MANAGERS[name];
  if (!descriptor) {
    throw new Error(`Unsupported package manager: "${name}"`);
  }

  const packageManager = new PackageManager(host, cwd, descriptor, { dryRun, logger });

  // Do not verify if the package manager is installed during a dry run.
  if (!dryRun) {
    try {
      await packageManager.getVersion();
    } catch {
      if (source === 'default') {
        throw new Error(
          `'${DEFAULT_PACKAGE_MANAGER}' was selected as the default package manager, but it is not installed or` +
            ` cannot be found in the PATH. Please install '${DEFAULT_PACKAGE_MANAGER}' to continue.`,
        );
      } else {
        throw new Error(
          `The project is configured to use '${name}', but it is not installed or cannot be` +
            ` found in the PATH. Please install '${name}' to continue.`,
        );
      }
    }
  }

  logger?.debug(`Successfully created PackageManager for '${name}'.`);

  return packageManager;
}
