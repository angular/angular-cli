/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert/strict';
import { major } from 'semver';
import { discover } from './discovery';
import { Host, NodeJS_HOST } from './host';
import { Logger } from './logger';
import { PackageManager } from './package-manager';
import { PackageManagerName, SUPPORTED_PACKAGE_MANAGERS } from './package-manager-descriptor';

/**
 * Information about the package manager to use for a given project.
 */
export type ConfiguredPackageManagerInfo = [name?: PackageManagerName, version?: string];

/**
 * The default package manager to use when none is discovered or configured.
 */
const DEFAULT_PACKAGE_MANAGER: PackageManagerName = 'npm';

/**
 * Gets the version of the package manager.
 * @param host A `Host` instance for running commands.
 * @param cwd The absolute path to the working directory.
 * @param name The name of the package manager.
 * @param logger An optional logger instance.
 * @returns A promise that resolves to the version string.
 */
async function getPackageManagerVersion(
  host: Host,
  cwd: string,
  name: PackageManagerName,
  logger?: Logger,
): Promise<string> {
  const descriptor = SUPPORTED_PACKAGE_MANAGERS[name];
  logger?.debug(`Getting ${name} version...`);

  const { stdout } = await host.runCommand(descriptor.binary, descriptor.versionCommand, { cwd });
  const version = stdout.trim();
  logger?.debug(`${name} version is '${version}'.`);

  return version;
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
  configured: ConfiguredPackageManagerInfo = [],
  logger?: Logger,
  dryRun?: boolean,
): Promise<{
  name: PackageManagerName;
  source: 'configured' | 'discovered' | 'default';
  version?: string;
}> {
  let [name, version] = configured;
  let source: 'configured' | 'discovered' | 'default';

  if (name) {
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
    assert.deepStrictEqual(
      SUPPORTED_PACKAGE_MANAGERS.yarn.versionCommand,
      SUPPORTED_PACKAGE_MANAGERS['yarn-classic'].versionCommand,
      'Yarn and Yarn Classic version commands must match for detection logic to be valid.',
    );

    try {
      version ??= await getPackageManagerVersion(host, cwd, name, logger);
      if (version && major(version) < 2) {
        name = 'yarn-classic';
        logger?.debug(`Detected yarn classic. Using 'yarn-classic'.`);
      }
    } catch {
      logger?.debug('Failed to get yarn version.');
    }
  } else if (name === 'yarn') {
    logger?.debug('Skipping yarn version check due to dry run. Assuming modern yarn.');
  }

  return { name, source, version };
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
  configuredPackageManager?: ConfiguredPackageManagerInfo;
  logger?: Logger;
  dryRun?: boolean;
  tempDirectory?: string;
}): Promise<PackageManager> {
  const { cwd, configuredPackageManager, logger, dryRun, tempDirectory } = options;
  const host = NodeJS_HOST;

  const result = await determinePackageManager(host, cwd, configuredPackageManager, logger, dryRun);
  const { name, source } = result;
  let { version } = result;

  const descriptor = SUPPORTED_PACKAGE_MANAGERS[name];
  if (!descriptor) {
    throw new Error(`Unsupported package manager: "${name}"`);
  }

  // Do not verify if the package manager is installed during a dry run.
  let initializationError: Error | undefined;
  if (!dryRun && !version) {
    try {
      version = await getPackageManagerVersion(host, cwd, name, logger);
    } catch {
      if (source === 'default') {
        initializationError = new Error(
          `'${DEFAULT_PACKAGE_MANAGER}' was selected as the default package manager, but it is not installed or` +
            ` cannot be found in the PATH. Please install '${DEFAULT_PACKAGE_MANAGER}' to continue.`,
        );
      } else {
        initializationError = new Error(
          `The project is configured to use '${name}', but it is not installed or cannot be` +
            ` found in the PATH. Please install '${name}' to continue.`,
        );
      }
    }
  }

  const packageManager = new PackageManager(host, cwd, descriptor, {
    dryRun,
    logger,
    tempDirectory,
    version,
    initializationError,
  });

  logger?.debug(`Successfully created PackageManager for '${name}'.`);

  return packageManager;
}
