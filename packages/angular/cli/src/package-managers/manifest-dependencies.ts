/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { dirname, join } from 'node:path';
import type { Host } from './host';
import type { InstalledPackage } from './package-tree';

/**
 * Maximum number of concurrent file system read operations to prevent OS file descriptor exhaustion.
 */
const MAX_CONCURRENT_READS = 16;

/**
 * Maps each item to a result using an asynchronous function, running at most `limit` operations
 * concurrently. Results are returned in the same order as the input items.
 */
async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

  return results;
}

/**
 * Checks whether a path exists and matches the expected type.
 */
async function isPathOfType(
  host: Host,
  path: string,
  type: 'file' | 'directory' | 'any',
): Promise<boolean> {
  try {
    const stats = await host.stat(path);

    switch (type) {
      case 'file':
        return stats.isFile();
      case 'directory':
        return stats.isDirectory();
      case 'any':
        return true;
    }
  } catch {
    return false;
  }
}

/**
 * Finds existing `node_modules` directories starting from `startDir` and walking up
 * ancestor directories until reaching a directory with one of `lockfiles` or the git repository root.
 */
async function findNodeModulesDirectories(
  host: Host,
  startDir: string,
  lockfiles: readonly string[],
): Promise<string[]> {
  const directories: string[] = [];
  let currentDir = startDir;

  while (true) {
    const nodeModulesPath = join(currentDir, 'node_modules');
    const [hasNodeModules, isGitRoot, ...lockfileChecks] = await Promise.all([
      isPathOfType(host, nodeModulesPath, 'directory'),
      // `.git` is a file (not a directory) in git worktrees and submodules.
      isPathOfType(host, join(currentDir, '.git'), 'any'),
      ...lockfiles.map((lockfile) => isPathOfType(host, join(currentDir, lockfile), 'file')),
    ]);

    if (hasNodeModules) {
      directories.push(nodeModulesPath);
    }

    // Stop walking up once we reach a directory containing the package manager's lockfile
    // or the git repository root.
    if (isGitRoot || lockfileChecks.some(Boolean)) {
      break;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return directories;
}

/**
 * Resolves the installed manifest of a package by searching the given `node_modules`
 * directories in order.
 */
async function resolveInstalledPackage(
  host: Host,
  packageName: string,
  nodeModulesDirs: readonly string[],
): Promise<InstalledPackage | undefined> {
  for (const nodeModulesDir of nodeModulesDirs) {
    const packagePath = join(nodeModulesDir, packageName);
    try {
      const pkgContent = await host.readFile(join(packagePath, 'package.json'));
      const { version } = JSON.parse(pkgContent) as { version?: unknown };
      if (typeof version === 'string') {
        return { name: packageName, version, path: packagePath };
      }
    } catch {
      // Continue searching ancestor node_modules directories.
    }
  }

  return undefined;
}

/**
 * Resolves installed versions of dependencies declared in the given directory's `package.json`
 * by searching ancestor `node_modules` directories starting from `cwd`.
 *
 * The returned map preserves the declaration order of the manifest.
 */
export async function resolveManifestDependencies(
  host: Host,
  cwd: string,
  lockfiles: readonly string[],
): Promise<Map<string, InstalledPackage>> {
  const resolvedDependencies = new Map<string, InstalledPackage>();

  let manifest: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    manifest = JSON.parse(await host.readFile(join(cwd, 'package.json')));
  } catch {
    return resolvedDependencies;
  }

  if (!manifest || typeof manifest !== 'object') {
    return resolvedDependencies;
  }

  const declaredPackages = new Set<string>();
  for (const depMap of [manifest.dependencies, manifest.devDependencies]) {
    if (!depMap || typeof depMap !== 'object') {
      continue;
    }
    for (const [name, specifier] of Object.entries(depMap)) {
      if (typeof specifier === 'string' && !specifier.startsWith('workspace:')) {
        declaredPackages.add(name);
      }
    }
  }

  if (declaredPackages.size === 0) {
    return resolvedDependencies;
  }

  const nodeModulesDirs = await findNodeModulesDirectories(host, cwd, lockfiles);
  if (nodeModulesDirs.length === 0) {
    return resolvedDependencies;
  }

  const installedPackages = await mapConcurrent(
    [...declaredPackages],
    MAX_CONCURRENT_READS,
    (packageName) => resolveInstalledPackage(host, packageName, nodeModulesDirs),
  );

  for (const installedPackage of installedPackages) {
    if (installedPackage) {
      resolvedDependencies.set(installedPackage.name, installedPackage);
    }
  }

  return resolvedDependencies;
}
