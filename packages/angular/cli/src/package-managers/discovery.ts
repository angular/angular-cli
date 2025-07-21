/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains the logic for discovering the package manager
 * used in a project by searching for lockfiles. It is designed to be efficient
 * and to correctly handle monorepo structures.
 */

import { dirname, join } from 'node:path';
import { Host } from './host';
import { Logger } from './logger';
import {
  PACKAGE_MANAGER_PRECEDENCE,
  PackageManagerName,
  SUPPORTED_PACKAGE_MANAGERS,
} from './package-manager-descriptor';

/**
 * A map from lockfile names to their corresponding package manager.
 * This is a performance optimization to avoid iterating over all possible
 * lockfiles in every directory.
 */
const LOCKFILE_TO_PACKAGE_MANAGER = new Map<string, PackageManagerName>();
for (const [name, descriptor] of Object.entries(SUPPORTED_PACKAGE_MANAGERS)) {
  for (const lockfile of descriptor.lockfiles) {
    LOCKFILE_TO_PACKAGE_MANAGER.set(lockfile, name as PackageManagerName);
  }
}

/**
 * Searches a directory for lockfiles and returns a set of package managers that correspond to them.
 * @param host A `Host` instance for interacting with the file system.
 * @param directory The directory to search.
 * @param logger An optional logger instance.
 * @returns A promise that resolves to a set of package manager names.
 */
async function findLockfiles(
  host: Host,
  directory: string,
  logger?: Logger,
): Promise<Set<PackageManagerName>> {
  logger?.debug(`Searching for lockfiles in '${directory}'...`);

  try {
    const files = await host.readdir(directory);
    const foundPackageManagers = new Set<PackageManagerName>();

    for (const file of files) {
      const packageManager = LOCKFILE_TO_PACKAGE_MANAGER.get(file);
      if (packageManager) {
        logger?.debug(`  Found '${file}'.`);
        foundPackageManagers.add(packageManager);
      }
    }

    return foundPackageManagers;
  } catch (e) {
    logger?.debug(`  Failed to read directory: ${e}`);

    // Ignore directories that don't exist or can't be read.
    return new Set();
  }
}

/**
 * Checks if a given path is a directory.
 * @param host A `Host` instance for interacting with the file system.
 * @param path The path to check.
 * @returns A promise that resolves to true if the path is a directory, false otherwise.
 */
async function isDirectory(host: Host, path: string): Promise<boolean> {
  try {
    return (await host.stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Discovers the package manager used in a project by searching for lockfiles.
 *
 * This function searches for lockfiles in the given directory and its ancestors.
 * If multiple lockfiles are found, it uses the precedence array to determine
 * which package manager to use. The search is bounded by the git repository root.
 *
 * @param host A `Host` instance for interacting with the file system.
 * @param startDir The directory to start the search from.
 * @param logger An optional logger instance.
 * @returns A promise that resolves to the name of the discovered package manager, or null if none is found.
 */
export async function discover(
  host: Host,
  startDir: string,
  logger?: Logger,
): Promise<PackageManagerName | null> {
  logger?.debug(`Starting package manager discovery in '${startDir}'...`);
  let currentDir = startDir;

  while (true) {
    const found = await findLockfiles(host, currentDir, logger);

    if (found.size > 0) {
      logger?.debug(`Found lockfile(s): [${[...found].join(', ')}]. Applying precedence...`);
      for (const packageManager of PACKAGE_MANAGER_PRECEDENCE) {
        if (found.has(packageManager)) {
          logger?.debug(`Selected '${packageManager}' based on precedence.`);

          return packageManager;
        }
      }
    }

    // Stop searching if we reach the git repository root.
    if (await isDirectory(host, join(currentDir, '.git'))) {
      logger?.debug(`Reached repository root at '${currentDir}'. Stopping search.`);

      return null;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // We have reached the filesystem root.
      logger?.debug('Reached filesystem root. No lockfile found.');

      return null;
    }

    currentDir = parentDir;
  }
}
