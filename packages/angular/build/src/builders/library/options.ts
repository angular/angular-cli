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
import { escapePath, glob } from 'tinyglobby';
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

  /** Absolute path to tsConfig file for this entry point. */
  tsConfigPath: string;

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
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
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
    entryPoints: rawEntryPoints,
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

  const entryPoints = await normalizeEntryPoints(
    rawEntryPoints,
    workspaceRoot,
    resolvedTsConfigPath,
    projectName,
    packageName,
  );

  const allowedNonPeerDependencies: RegExp[] = [];
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

  const combinedAssets = [...defaultAssets, ...(rawAssets ?? [])];
  const assets = combinedAssets.length
    ? normalizeAssetPatterns(combinedAssets, workspaceRoot, projectRoot, projectSourceRoot)
    : [];

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
 * @param key The entry point key from configuration (e.g. '.' or './testing').
 * @param value The entry point file path string or object with entryPoint and tsConfig.
 * @param workspaceRoot The workspace root directory.
 * @param defaultTsConfigPath The default tsConfig path for the project.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns The normalized entry point descriptor.
 */
function normalizeEntryPoint(
  key: string,
  value: LibraryBuilderOptions['entryPoints'][string],
  workspaceRoot: string,
  defaultTsConfigPath: string,
  packageName: string,
): NormalizedEntryPoint {
  const posixKey = toPosixPath(key).replace(/\/+$/, '');
  const isPrimary = posixKey === '.' || posixKey === '';
  const name = isPrimary
    ? '.'
    : posixKey[0] === '.' && posixKey[1] === '/'
      ? posixKey.slice(2)
      : posixKey;

  if (name !== '.' && (path.posix.isAbsolute(name) || name.includes('..'))) {
    throw new Error(
      `Invalid entry point key '${key}'. Entry point keys must be relative subpaths without '..' (e.g. './testing' or 'testing').`,
    );
  }

  const subpath = isPrimary ? '.' : `./${name}`;
  const displayName = isPrimary ? packageName : `${packageName}/${name}`;
  const bundleName = getEntryPointBundleName(packageName, name, isPrimary);

  const entryFilePath = path.resolve(
    workspaceRoot,
    typeof value === 'string' ? value : value.entryPoint,
  );

  if (!/\.(?:ts|mts)$/.test(entryFilePath) || /\.d\.(?:ts|mts)$/.test(entryFilePath)) {
    throw new Error(
      `Entry point '${key}' file path must be a TypeScript file ('.ts' or '.mts'): '${entryFilePath}'.`,
    );
  }

  const tsConfigPath =
    typeof value !== 'string' && value.tsConfig
      ? path.resolve(workspaceRoot, value.tsConfig)
      : defaultTsConfigPath;

  return {
    subpath,
    name,
    displayName,
    bundleName,
    entryFilePath,
    tsConfigPath,
    isPrimary,
  };
}

/**
 * Normalizes all entry points for the library project.
 *
 * A key and its entry file path can each contain a single '*', the same as subpath patterns
 * in package.json `exports`. The '*' in the path matches any non-empty string, including '/',
 * and adds an entry point for every matching file, with the matched value substituted into
 * the key. Explicit entry points take precedence over pattern matches with the same name or
 * the same entry file.
 *
 * @param rawEntryPoints The raw entryPoints dictionary from schema options.
 * @param workspaceRoot The workspace root directory.
 * @param defaultTsConfigPath The default tsConfig path for the project.
 * @param projectName The project name used in error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name.
 */
async function normalizeEntryPoints(
  rawEntryPoints: LibraryBuilderOptions['entryPoints'],
  workspaceRoot: string,
  defaultTsConfigPath: string,
  projectName: string,
  packageName: string,
): Promise<Map<string, NormalizedEntryPoint>> {
  const entryPoints = new Map<string, NormalizedEntryPoint>();
  const patterns: [string, LibraryBuilderOptions['entryPoints'][string]][] = [];
  let hasPrimary = false;

  const addEntryPoint = (key: string, entryPoint: NormalizedEntryPoint) => {
    if (entryPoints.has(entryPoint.name)) {
      throw new Error(
        `Duplicate entry point detected: '${key}' resolves to the same name ('${entryPoint.name}') as an existing entry point.`,
      );
    }
    entryPoints.set(entryPoint.name, entryPoint);
    if (entryPoint.isPrimary) {
      hasPrimary = true;
    }
  };

  for (const [key, value] of Object.entries(rawEntryPoints)) {
    const entryFile = typeof value === 'string' ? value : value.entryPoint;
    if (key.includes('*') || entryFile.includes('*')) {
      patterns.push([key, value]);
      continue;
    }

    addEntryPoint(
      key,
      normalizeEntryPoint(key, value, workspaceRoot, defaultTsConfigPath, packageName),
    );
  }

  const explicitNames = new Set(entryPoints.keys());
  const explicitFiles = new Set(Array.from(entryPoints.values(), (e) => e.entryFilePath));

  for (const [key, value] of patterns) {
    const entryFile = typeof value === 'string' ? value : value.entryPoint;
    for (const [matchedKey, matchedFile] of await expandEntryPointPattern(
      key,
      entryFile,
      workspaceRoot,
    )) {
      const entryPoint = normalizeEntryPoint(
        matchedKey,
        typeof value === 'string' ? matchedFile : { ...value, entryPoint: matchedFile },
        workspaceRoot,
        defaultTsConfigPath,
        packageName,
      );
      if (explicitNames.has(entryPoint.name) || explicitFiles.has(entryPoint.entryFilePath)) {
        continue;
      }

      addEntryPoint(matchedKey, entryPoint);
    }
  }

  if (!hasPrimary) {
    throw new Error(
      `The 'entryPoints' option in project '${projectName}' must contain a primary entry point with key '.'.`,
    );
  }

  return entryPoints;
}

/**
 * Expands an entry point pattern into the key and entry file of every matching file,
 * sorted by key.
 *
 * @param key The entry point key containing a single '*'.
 * @param entryFile The entry file path containing a single '*'.
 * @param workspaceRoot The workspace root directory.
 * @returns The expanded keys and absolute entry file paths.
 */
async function expandEntryPointPattern(
  key: string,
  entryFile: string,
  workspaceRoot: string,
): Promise<[string, string][]> {
  if (key.split('*').length !== 2 || entryFile.split('*').length !== 2) {
    throw new Error(
      `Invalid entry point pattern '${key}': the key and the entry file path must each contain exactly one '*'.`,
    );
  }

  const pattern = toPosixPath(path.resolve(workspaceRoot, entryFile));
  const starIndex = pattern.indexOf('*');
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  const baseDir = prefix.slice(0, prefix.lastIndexOf('/') + 1);

  const files = await glob(`**/*${escapePath(suffix.slice(suffix.lastIndexOf('/') + 1))}`, {
    cwd: baseDir,
    ignore: ['**/node_modules/**'],
  });

  const [keyPrefix, keySuffix] = key.split('*');
  const matches: [string, string][] = [];
  for (const file of files) {
    const filePath = baseDir + file;
    if (
      filePath.length <= prefix.length + suffix.length ||
      !filePath.startsWith(prefix) ||
      !filePath.endsWith(suffix) ||
      !/\.m?ts$/.test(filePath) ||
      /\.d\.m?ts$/.test(filePath)
    ) {
      continue;
    }

    const match = filePath.slice(prefix.length, filePath.length - suffix.length);
    matches.push([keyPrefix + match + keySuffix, filePath]);
  }

  if (matches.length === 0) {
    throw new Error(`Entry point pattern '${key}' did not match any files: '${entryFile}'.`);
  }

  return matches.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
