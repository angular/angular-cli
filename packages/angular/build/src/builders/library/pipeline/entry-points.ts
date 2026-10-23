/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { isSubDirectory, toPosixPath } from '../../../utils/path';
import type { BuilderState } from '../builder-state';
import type { NormalizedEntryPoint, NormalizedLibraryOptions, PackageJsonData } from '../types';
import type { BundleEntryPointInput } from './bundler';

/**
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name (defaults to '.').
 * @returns The sanitized bundle base name.
 */
export function getEntryPointBundleName(packageName: string, entryPointName = '.'): string {
  const isPrimary = entryPointName === '.';
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
 * @param projectRoot The library project root POSIX directory path.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns The normalized entry point descriptor with POSIX paths.
 */
function normalizeEntryPoint(
  key: string,
  posixKey: string,
  isPrimary: boolean,
  targetPath: string,
  projectRoot: string,
  packageName: string,
): NormalizedEntryPoint {
  const name = isPrimary ? '.' : posixKey.startsWith('./') ? posixKey.slice(2) : posixKey;

  if (name !== '.' && (path.posix.isAbsolute(name) || name.includes('..'))) {
    throw new Error(
      `Invalid entry point key '${key}'. Entry point keys must be relative subpaths without '..' (e.g. './testing').`,
    );
  }

  const subpath = isPrimary ? '.' : `./${name}`;
  const displayName = isPrimary ? packageName : `${packageName}/${name}`;
  const bundleName = getEntryPointBundleName(packageName, name);
  const entryFilePath = toPosixPath(path.resolve(projectRoot, targetPath));

  if (!isSubDirectory(projectRoot, entryFilePath)) {
    throw new Error(
      `Entry point '${key}' file path '${entryFilePath}' is outside the project root '${projectRoot}'.`,
    );
  }

  if (!/(?<!\.d)\.m?ts$/.test(entryFilePath)) {
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
 * @param projectRoot The library project root POSIX directory path.
 * @param packageJsonPath POSIX path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name with POSIX entry file paths.
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
    const hasSubpathKeys = Object.keys(rawExports).some((k) => k.startsWith('.'));
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

    if (!isPrimary && !/(?<!\.d)\.m?ts$/.test(target)) {
      // Static asset, stylesheet, declaration file, or package.json export; preserve in package.json without compiling.
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
    hasPrimary ||= isPrimary;
  }

  if (!hasPrimary) {
    throw new Error(
      `The 'exports' field in '${packageJsonPath}' must contain a primary entry point with key '.'.`,
    );
  }

  return entryPoints;
}

/**
 * Determines whether two sets of normalized entry points differ in keys, POSIX entry paths,
 * subpaths, bundle names, or display names.
 *
 * @param oldEntryPoints The previous map of normalized entry points.
 * @param newEntryPoints The new map of normalized entry points.
 * @returns `true` if any entry point was added, removed, or modified; otherwise `false`.
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
 *
 * @param packageJson The reloaded `package.json` data.
 * @param options The normalized library builder options.
 * @param buildState The state preserved across incremental builds.
 */
export function updateWatchedEntryPoints(
  packageJson: PackageJsonData,
  options: NormalizedLibraryOptions,
  buildState: BuilderState,
): void {
  const { packageJsonPath } = options;
  if (!packageJson.name) {
    throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
  }

  const newEntryPoints = normalizeEntryPoints(
    packageJson.exports,
    options.projectRoot,
    packageJsonPath,
    packageJson.name,
  );

  const { watchedCompilationFiles, previousBundleResults } = buildState;

  if (haveEntryPointsChanged(options.entryPoints, newEntryPoints)) {
    for (const oldEntryPoint of options.entryPoints.values()) {
      watchedCompilationFiles.delete(oldEntryPoint.entryFilePath);
    }

    for (const entryPoint of newEntryPoints.values()) {
      watchedCompilationFiles.add(entryPoint.entryFilePath);
    }

    for (const name of previousBundleResults.keys()) {
      const oldEp = options.entryPoints.get(name);
      const newEp = newEntryPoints.get(name);
      if (
        !newEp ||
        !oldEp ||
        newEp.entryFilePath !== oldEp.entryFilePath ||
        newEp.bundleName !== oldEp.bundleName
      ) {
        previousBundleResults.delete(name);
      }
    }

    options.entryPoints = newEntryPoints;
    buildState.hasEntryPointsChanges = true;
  }

  options.packageJson = packageJson;
  options.packageName = packageJson.name;
}

/**
 * Determines which entry points have modified JavaScript or declaration files
 * and collects them for bundling.
 *
 * @param options The normalized library builder options.
 * @param buildState The state preserved across incremental builds.
 * @returns The list of entry points that require bundling in the current build iteration.
 */
export function collectEntryPointsToBundle(
  options: NormalizedLibraryOptions,
  buildState: BuilderState,
): BundleEntryPointInput[] {
  const { pendingChangedEsmFiles, pendingChangedDtsFiles, previousBundleResults, executionResult } =
    buildState;
  const itemsToBundle: BundleEntryPointInput[] = [];

  for (const entryPoint of options.entryPoints.values()) {
    const previousBundleResult = previousBundleResults.get(entryPoint.name);
    const hasEsmChanges =
      !previousBundleResult ||
      !previousBundleResult.esmModuleIds.isDisjointFrom(pendingChangedEsmFiles);
    const hasDtsChanges =
      !previousBundleResult ||
      !previousBundleResult.dtsModuleIds.isDisjointFrom(pendingChangedDtsFiles);

    if (hasEsmChanges || hasDtsChanges) {
      executionResult.addLog(`Compiling ${entryPoint.displayName}...`);
      itemsToBundle.push({
        entryPoint,
        hasEsmChanges,
        hasDtsChanges,
        previousBundleResult,
      });
    }
  }

  return itemsToBundle;
}
