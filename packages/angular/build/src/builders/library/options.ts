/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { StylesheetPluginsass } from '../../tools/esbuild/stylesheets/stylesheet-plugin-factory';
import { normalizeAssetPatterns } from '../../utils';
import { supportColor } from '../../utils/color';
import { assertIsError } from '../../utils/error';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { isSubDirectory, toPosixPath } from '../../utils/path';
import {
  type PostcssConfiguration,
  generateSearchDirectories,
  getTailwindConfig,
  loadPostcssConfiguration,
} from '../../utils/postcss-configuration';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { getEntryPointBundleName } from './pipeline/utils';
import type { Schema as LibraryBuilderOptions } from './schema';

export interface NormalizedEntryPoint {
  /** The subpath in package.json exports (e.g. '.' or './testing'). */
  subpath: string;

  /** Subpath name without leading './' (e.g. '.' or 'testing'). */
  name: string;

  /** Display name of the entry point (e.g. '@my/lib' or '@my/lib/testing'). */
  displayName: string;

  /** Base name of the output bundle (e.g. 'my-lib' or 'my-lib-testing'). */
  bundleName: string;

  /** Absolute path to entry file. */
  entryFilePath: string;

  /** Is this the primary entry point ('.')? */
  isPrimary: boolean;
}

export interface PackageJsonData {
  name: string;
  version?: string;
  type?: string;
  main?: string;
  module?: string;
  typings?: string;
  types?: string;
  sideEffects?: boolean | string[];
  exports?: string | Record<string, unknown>;
  scripts?: Record<string, string>;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  [key: string]: unknown;
}

export interface NormalizedLibraryOptions {
  workspaceRoot: string;
  projectRoot: string;
  packageName: string;
  packageJson: PackageJsonData;
  outputPath: string;
  deleteOutputPath: boolean;
  packageJsonPath: string;
  tsConfigPath: string;
  entryPoints: Map<string, NormalizedEntryPoint>;
  inlineStyleLanguage: 'css' | 'less' | 'sass' | 'scss';
  styleIncludePaths: string[];
  sass?: StylesheetPluginsass;
  assets: ReturnType<typeof normalizeAssetPatterns>;
  compilationMode: 'partial' | 'full';
  declarationMap: boolean;
  allowedNonPeerDependencies: RegExp[];
  keepLifecycleScripts: boolean;
  watch: boolean;
  poll?: number;
  preserveSymlinks: boolean;
  progress: boolean;
  clearScreen?: boolean;
  cacheOptions: ReturnType<typeof normalizeCacheOptions>;
  postcssConfiguration?: { config: PostcssConfiguration; configPath: string };
  tailwindConfiguration?: { file: string; package: string };
  colors: boolean;
}

export async function normalizeLibraryOptions(
  context: BuilderContext,
  projectName: string,
  options: LibraryBuilderOptions,
): Promise<NormalizedLibraryOptions> {
  const { workspaceRoot } = context;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const { projectRoot, projectSourceRoot } = getProjectRootPaths(workspaceRoot, projectMetadata);

  const outputPath = options.outputPath ?? path.join(workspaceRoot, 'dist', projectName);
  const resolvedOutputPath = path.resolve(workspaceRoot, outputPath);
  if (
    resolvedOutputPath === projectRoot ||
    isSubDirectory(resolvedOutputPath, projectRoot) ||
    isSubDirectory(projectRoot, resolvedOutputPath)
  ) {
    throw new Error(
      `The 'outputPath' (${resolvedOutputPath}) cannot be the project root, ` +
        `contain the project root, or be located within the project root.`,
    );
  }

  const {
    tsConfig,
    assets: rawAssets,
    stylePreprocessorOptions,
    inlineStyleLanguage = 'css',
    compilationMode = 'partial',
    declarationMap = false,
    allowedNonPeerDependencies: rawAllowedNonPeerDependencies = [],
    keepLifecycleScripts = false,
    watch = false,
    poll,
    preserveSymlinks = process.execArgv.includes('--preserve-symlinks'),
    deleteOutputPath = true,
    progress = true,
    clearScreen,
  } = options;

  const resolvedTsConfigPath = path.resolve(workspaceRoot, tsConfig);
  const packageJsonPath = path.join(projectRoot, 'package.json');

  let packageJson: PackageJsonData;
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent) as PackageJsonData;
  } catch (error) {
    assertIsError(error);
    throw new Error(`Failed to read 'package.json' at '${packageJsonPath}': ${error.message}`, {
      cause: error,
    });
  }

  const { name: packageName } = packageJson;
  if (!packageName) {
    throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
  }

  const entryPoints = normalizeEntryPoints(
    packageJson.exports,
    projectRoot,
    packageJsonPath,
    packageName,
  );

  const allowedNonPeerDependencies: RegExp[] = [/^tslib$/];
  for (const pattern of rawAllowedNonPeerDependencies) {
    try {
      allowedNonPeerDependencies.push(new RegExp(pattern));
    } catch (error) {
      assertIsError(error);
      throw new Error(
        `Invalid regular expression '${pattern}' in 'allowedNonPeerDependencies' for project '${projectName}': ${error.message}`,
        { cause: error },
      );
    }
  }

  const defaultAssets: (string | { glob: string; input: string; output: string })[] = [
    { glob: 'LICENSE*', input: projectRoot, output: '.' },
    { glob: 'README.md', input: projectRoot, output: '.' },
  ];

  for (const entryPoint of entryPoints.values()) {
    if (entryPoint.isPrimary) {
      continue;
    }
    defaultAssets.push({
      glob: 'README.md',
      input: path.dirname(entryPoint.entryFilePath),
      output: entryPoint.name,
    });
  }

  const assets = normalizeAssetPatterns(
    [...defaultAssets, ...(rawAssets ?? [])],
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
  );

  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);

  const styleIncludePaths = (stylePreprocessorOptions?.includePaths ?? []).map((p: string) =>
    path.resolve(workspaceRoot, p),
  );

  const searchDirectories = await generateSearchDirectories([projectRoot, workspaceRoot]);
  const postcssConfiguration = await loadPostcssConfiguration(searchDirectories);
  const tailwindConfiguration = postcssConfiguration
    ? undefined
    : await getTailwindConfig(searchDirectories, workspaceRoot, context.logger);

  return {
    workspaceRoot,
    projectRoot,
    packageName,
    packageJson,
    outputPath: resolvedOutputPath,
    deleteOutputPath,
    packageJsonPath,
    tsConfigPath: resolvedTsConfigPath,
    entryPoints,
    inlineStyleLanguage,
    styleIncludePaths,
    sass: stylePreprocessorOptions?.sass as unknown as StylesheetPluginsass | undefined,
    assets,
    compilationMode,
    declarationMap,
    allowedNonPeerDependencies,
    keepLifecycleScripts,
    watch,
    poll,
    preserveSymlinks,
    progress,
    clearScreen,
    cacheOptions,
    colors: supportColor(),
    postcssConfiguration,
    tailwindConfiguration,
  };
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
  const displayName = isPrimary ? packageName : `${packageName}/${name}`;
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
 * Normalizes all entry points from the library's `package.json` `exports` field.
 *
 * @param rawExports The `exports` field from `package.json`.
 * @param projectRoot The library project root directory.
 * @param packageJsonPath Path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name.
 */
function normalizeEntryPoints(
  rawExports: PackageJsonData['exports'],
  projectRoot: string,
  packageJsonPath: string,
  packageName: string,
): Map<string, NormalizedEntryPoint> {
  if (!rawExports || (typeof rawExports !== 'string' && typeof rawExports !== 'object')) {
    throw new Error(
      `The 'package.json' at '${packageJsonPath}' must contain an 'exports' field defining the primary entry point ('.').`,
    );
  }

  const exportsRecord = typeof rawExports === 'string' ? { '.': rawExports } : rawExports;

  const entryPoints = new Map<string, NormalizedEntryPoint>();
  let hasPrimary = false;

  for (const [key, value] of Object.entries(exportsRecord)) {
    let target: string | undefined;

    if (typeof value === 'string') {
      target = value;
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof (value as Record<string, unknown>)['default'] === 'string'
    ) {
      target = (value as Record<string, unknown>)['default'] as string;
    }

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

    if (entryPoints.has(entryPoint.name)) {
      throw new Error(
        `Duplicate entry point detected: '${key}' resolves to the same name ('${entryPoint.name}') as an existing entry point.`,
      );
    }

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
