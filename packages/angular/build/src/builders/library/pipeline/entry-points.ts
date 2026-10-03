/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { toPosixPath } from '../../../utils/path';
import type {
  NormalizedEntryPoint,
  NormalizedLibraryOptions,
  PackageJsonData,
  SingleBuildState,
} from '../types';

/**
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name (defaults to '.').
 * @returns The sanitized bundle base name.
 */
export function getEntryPointBundleName(packageName: string, entryPointName = '.'): string {
  const isPrimary = !entryPointName || entryPointName === '.';
  const pkgName = packageName[0] === '@' ? packageName.slice(1) : packageName;
  const epName = isPrimary ? pkgName : `${pkgName}-${entryPointName}`;

  return epName.replaceAll('/', '-').toLowerCase();
}

/**
 * Normalizes a single entry point specification.
 *
 * @param key The entry point key from package.json exports (e.g. '.' or './testing').
 * @param posixKey Normalized POSIX key without trailing slashes.
 * @param isPrimary Whether this is the primary entry point.
 * @param targetPath The relative file path string from exports.
 * @param projectRoot The library project root directory.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns The normalized entry point descriptor.
 */
function normalizeEntryPoint(
  key: string,
  posixKey: string,
  isPrimary: boolean,
  targetPath: string,
  projectRoot: string,
  packageName: string,
): NormalizedEntryPoint {
  const name = isPrimary
    ? '.'
    : posixKey[0] === '.' && posixKey[1] === '/'
      ? posixKey.slice(2)
      : posixKey;

  if (name !== '.' && (path.posix.isAbsolute(name) || name.includes('..'))) {
    throw new Error(
      `Invalid entry point key '${key}'. Entry point keys must be relative subpaths without '..' (e.g. './testing').`,
    );
  }

  const subpath = isPrimary ? '.' : `./${name}`;
  const displayName = (isPrimary ? packageName : `${packageName}/${name}`).toLowerCase();
  const bundleName = getEntryPointBundleName(packageName, name);
  const entryFilePath = path.resolve(projectRoot, targetPath);

  if (!/(?<!\.d)\.(?:ts|mts)$/.test(entryFilePath)) {
    throw new Error(
      `Entry point '${key}' file path must be a TypeScript file ('.ts' or '.mts'): '${entryFilePath}'.`,
    );
  }

  return {
    subpath,
    name,
    displayName,
    bundleName,
    entryFilePath,
    isPrimary,
  };
}

/**
 * Resolves the target TypeScript entry file path from an export value,
 * which may be a string, an array of fallback alternatives, or a condition object.
 *
 * @param value The raw export value for an entry point subpath.
 * @returns The resolved target string path, or undefined if none found.
 */
function resolveTarget(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const target = resolveTarget(item);
      if (target) {
        return target;
      }
    }

    return undefined;
  }

  if (typeof value === 'object' && value !== null) {
    return resolveTarget((value as Record<string, unknown>)['default']);
  }

  return undefined;
}

/**
 * Normalizes all entry points from the library's `package.json` `exports` field.
 *
 * @param rawExports The `exports` field from `package.json`.
 * @param projectRoot The library project root directory.
 * @param packageJsonPath Path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name.
 */
export function normalizeEntryPoints(
  rawExports: unknown,
  projectRoot: string,
  packageJsonPath: string,
  packageName: string,
): Map<string, NormalizedEntryPoint> {
  if (!rawExports || (typeof rawExports !== 'string' && typeof rawExports !== 'object')) {
    throw new Error(
      `The 'package.json' at '${packageJsonPath}' must contain an 'exports' field defining the primary entry point ('.').`,
    );
  }

  let exportsRecord: Record<string, unknown>;
  if (typeof rawExports === 'string' || Array.isArray(rawExports)) {
    exportsRecord = { '.': rawExports };
  } else {
    // If an object has no keys starting with '.', Node.js treats the entire object as the '.' entry point.
    const hasSubpathKeys = Object.keys(rawExports as object).some((k) => k.startsWith('.'));
    exportsRecord = hasSubpathKeys ? (rawExports as Record<string, unknown>) : { '.': rawExports };
  }

  const entryPoints = new Map<string, NormalizedEntryPoint>();
  const usedBundleNames = new Map<string, string>();
  let hasPrimary = false;

  for (const [key, value] of Object.entries(exportsRecord)) {
    const target = resolveTarget(value);

    const posixKey = toPosixPath(key).replace(/\/+$/, '');
    const isPrimary = posixKey === '.' || posixKey === '';

    if (!target) {
      if (isPrimary) {
        throw new Error(
          `The primary entry point '.' in '${packageJsonPath}' must specify a string path ` +
            `or a 'default' condition pointing to a TypeScript file.`,
        );
      }

      // Non-JS/TS conditional export (e.g., sass/style-only subpath); preserve in package.json without compiling.
      continue;
    }

    if (!isPrimary && !/\.m?ts$/.test(target)) {
      // Static asset, stylesheet, or package.json export; preserve in package.json without compiling.
      continue;
    }

    const entryPoint = normalizeEntryPoint(
      key,
      posixKey,
      isPrimary,
      target,
      projectRoot,
      packageName,
    );

    const existingKey = usedBundleNames.get(entryPoint.bundleName);
    if (existingKey) {
      throw new Error(
        `Duplicate entry point detected: '${key}' resolves to the same bundle name ('${entryPoint.bundleName}') ` +
          `as existing entry point '${existingKey}'. ` +
          `Entry points must be unique and cannot differ only by case, slashes, or hyphens.`,
      );
    }

    usedBundleNames.set(entryPoint.bundleName, key);
    entryPoints.set(entryPoint.name, entryPoint);

    if (entryPoint.isPrimary) {
      hasPrimary = true;
    }
  }

  if (!hasPrimary) {
    throw new Error(
      `The 'exports' field in '${packageJsonPath}' must contain a primary entry point with key '.'.`,
    );
  }

  return entryPoints;
}

/**
 * Determines whether two sets of normalized entry points differ in keys, paths, or subpaths.
 */
export function haveEntryPointsChanged(
  oldEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>,
  newEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>,
): boolean {
  if (oldEntryPoints.size !== newEntryPoints.size) {
    return true;
  }

  for (const [name, oldEp] of oldEntryPoints) {
    const newEp = newEntryPoints.get(name);
    if (
      !newEp ||
      newEp.entryFilePath !== oldEp.entryFilePath ||
      newEp.subpath !== oldEp.subpath ||
      newEp.bundleName !== oldEp.bundleName ||
      newEp.displayName !== oldEp.displayName
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Updates watched files, entry points in options, and cached bundle results when package.json entry points change.
 */
export function updateWatchedEntryPoints(
  packageJson: PackageJsonData,
  options: NormalizedLibraryOptions,
  buildState: SingleBuildState,
  watchedCompilationFiles: Set<string>,
  packageJsonPath: string,
): void {
  const newEntryPoints = normalizeEntryPoints(
    packageJson.exports,
    options.projectRoot,
    packageJsonPath,
    options.packageName,
  );

  if (haveEntryPointsChanged(options.entryPoints, newEntryPoints)) {
    for (const entryPoint of newEntryPoints.values()) {
      watchedCompilationFiles.add(toPosixPath(entryPoint.entryFilePath));
    }

    for (const name of buildState.previousBundleResults.keys()) {
      const oldEp = options.entryPoints.get(name);
      const newEp = newEntryPoints.get(name);
      if (
        !newEp ||
        !oldEp ||
        newEp.entryFilePath !== oldEp.entryFilePath ||
        newEp.bundleName !== oldEp.bundleName
      ) {
        buildState.previousBundleResults.delete(name);
      }
    }

    options.entryPoints = newEntryPoints;
    buildState.hasEntryPointsChanges = true;
  }
}
