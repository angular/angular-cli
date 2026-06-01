/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains the logic for reading the user-configured
 * "minimum release age" (a.k.a. install cooldown) from the active package
 * manager. When configured, the CLI must respect the same gate during
 * automatic version selection (e.g. `ng update`, `ng add`); otherwise it can
 * pick a version that the package manager itself will refuse to install.
 *
 * Coverage notes:
 * - **npm** reads `min-release-age` from `.npmrc` (value in days).
 *   See https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age.
 * - **pnpm 10.x** reads `minimum-release-age` from `.npmrc` (value in minutes).
 *   pnpm 11+ migrated the canonical setting to `minimumReleaseAge` in
 *   `pnpm-workspace.yaml`, which is not currently parsed by this utility.
 * - **yarn-classic** has no native cooldown, but mirrors npm's `.npmrc`
 *   parsing, so we honor `min-release-age` when present.
 * - **yarn (berry)** uses `npmMinimalAgeGate` in `.yarnrc.yml`, which is not
 *   currently parsed by this utility.
 * - **bun** uses `install.minimumReleaseAge` in `bunfig.toml`, which is not
 *   currently parsed by this utility.
 */

import * as ini from 'ini';
import { dirname, join } from 'node:path';
import { Host } from './host';
import { Logger } from './logger';
import { PackageManagerDescriptor } from './package-manager-descriptor';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/**
 * Converts a value in `unit` to milliseconds.
 */
function toMs(value: number, unit: 'days' | 'minutes'): number {
  return unit === 'days' ? value * MS_PER_DAY : value * MS_PER_MINUTE;
}

/**
 * Reads and merges `.npmrc` files starting at `startDir` and walking up the
 * directory tree until either a git repository root or the filesystem root is
 * reached.
 *
 * Values defined in directories closer to `startDir` take precedence over
 * those defined in ancestor directories. This mirrors how `npm` itself
 * resolves project-level configuration.
 *
 * @returns The merged options as a plain object. Returns an empty object when
 *   no `.npmrc` files are found.
 */
async function readNpmrcChain(
  host: Host,
  startDir: string,
  logger?: Logger,
): Promise<Record<string, unknown>> {
  const directoriesToVisit: string[] = [];

  let currentDir = startDir;
  while (true) {
    directoriesToVisit.push(currentDir);

    // Stop walking when we reach a git repository root, mirroring `discovery.ts`.
    try {
      if ((await host.stat(join(currentDir, '.git'))).isDirectory()) {
        break;
      }
    } catch {
      // No `.git` here; continue searching upwards.
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached the filesystem root.
      break;
    }
    currentDir = parentDir;
  }

  // Apply ancestor configs first so that closer-to-cwd values override them.
  const merged: Record<string, unknown> = {};
  for (let i = directoriesToVisit.length - 1; i >= 0; i--) {
    const npmrcPath = join(directoriesToVisit[i], '.npmrc');
    let contents: string;
    try {
      contents = await host.readFile(npmrcPath);
    } catch {
      // File not present or unreadable.
      continue;
    }

    try {
      const parsed = ini.parse(contents) as Record<string, unknown>;
      Object.assign(merged, parsed);
      logger?.debug(`Loaded options from '${npmrcPath}'.`);
    } catch (e) {
      logger?.debug(`Failed to parse '${npmrcPath}': ${e}.`);
    }
  }

  return merged;
}

/**
 * Determines the minimum release age (in milliseconds) configured for the
 * given package manager.
 *
 * @param host A `Host` instance for reading configuration files.
 * @param cwd The directory from which to start the configuration search.
 * @param descriptor The active package manager's descriptor.
 * @param logger An optional logger instance.
 * @returns A non-negative number of milliseconds. Returns `0` when the active
 *   package manager has no minimum release age configured (or when this
 *   utility does not yet support reading the relevant configuration source).
 */
export async function getMinReleaseAgeMs(
  host: Host,
  cwd: string,
  descriptor: PackageManagerDescriptor,
  logger?: Logger,
): Promise<number> {
  const config = descriptor.minReleaseAge;
  if (!config) {
    return 0;
  }

  const npmrc = await readNpmrcChain(host, cwd, logger);
  const rawValue = npmrc[config.key];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 0;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return toMs(parsed, config.unit);
}
