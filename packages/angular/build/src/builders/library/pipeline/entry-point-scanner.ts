/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { NormalizedEntryPoint } from '../options';

const FILE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.d.ts', '.d.mts', '.d.cts'] as const;
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.mts', 'index.cts', 'index.d.ts'] as const;

export interface ScannedFileInfo {
  readonly packageImports: readonly string[];
  readonly relativeDependencies: readonly string[];
}

/**
 * Retrieves the directory entries for a given directory, cached in a Map.
 */
function getDirectoryEntries(
  dir: string,
  directoryCache: Map<string, Promise<Set<string>>>,
): Promise<Set<string>> {
  let entriesPromise = directoryCache.get(dir);
  if (!entriesPromise) {
    entriesPromise = fs
      .readdir(dir)
      .then((entries) => new Set(entries))
      .catch(() => new Set<string>());

    directoryCache.set(dir, entriesPromise);
  }

  return entriesPromise;
}

/**
 * Resolves a relative module import specifier to an existing TypeScript candidate file on disk.
 *
 * @param dir Directory of the containing file.
 * @param fileName Relative module specifier.
 * @param resolutionCache Cache of in-flight and resolved module candidate paths.
 * @param directoryCache Cache of directory entries to avoid repeated filesystem accesses.
 * @returns Absolute path to candidate file if found, otherwise undefined.
 */
async function resolveCandidate(
  dir: string,
  fileName: string,
  resolutionCache: Map<string, Promise<string | undefined>>,
  directoryCache: Map<string, Promise<Set<string>>>,
): Promise<string | undefined> {
  if (/\.[mc]?tsx?$/.test(fileName)) {
    return path.resolve(dir, fileName);
  }

  const basePath = path.resolve(dir, fileName.replace(/\.[mc]?js$/, ''));
  let resolvePromise = resolutionCache.get(basePath);
  if (resolvePromise) {
    return resolvePromise;
  }

  resolvePromise = (async () => {
    const parentDir = path.dirname(basePath);
    const baseName = path.basename(basePath);
    const parentEntries = await getDirectoryEntries(parentDir, directoryCache);

    for (const ext of FILE_EXTENSIONS) {
      const candidateName = baseName + ext;
      if (parentEntries.has(candidateName)) {
        return path.join(parentDir, candidateName);
      }
    }

    if (parentEntries.has(baseName)) {
      const subDirEntries = await getDirectoryEntries(basePath, directoryCache);
      for (const indexFile of INDEX_FILES) {
        if (subDirEntries.has(indexFile)) {
          return path.join(basePath, indexFile);
        }
      }
    }

    return undefined;
  })();

  resolutionCache.set(basePath, resolvePromise);

  return resolvePromise;
}

/**
 * Reads a TypeScript file, extracts its module imports via preProcessFile,
 * and resolves its relative dependencies.
 */
async function scanFile(
  filePath: string,
  resolutionCache: Map<string, Promise<string | undefined>>,
  directoryCache: Map<string, Promise<Set<string>>>,
): Promise<ScannedFileInfo | undefined> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }

  if (!content.includes('import') && !content.includes('export') && !content.includes('///')) {
    return { packageImports: [], relativeDependencies: [] };
  }

  const { importedFiles, typeReferenceDirectives, referencedFiles } = ts.preProcessFile(
    content,
    true,
    false,
  );

  const dir = path.dirname(filePath);
  const packageImports = new Set<string>();
  const relativeImports = new Set<string>();

  for (const { fileName } of [...importedFiles, ...typeReferenceDirectives, ...referencedFiles]) {
    if (fileName[0] === '.') {
      relativeImports.add(fileName);
    } else {
      packageImports.add(fileName);
    }
  }

  const relativeCandidates = await Promise.all(
    Array.from(relativeImports, (rel) =>
      resolveCandidate(dir, rel, resolutionCache, directoryCache),
    ),
  );

  const relativeDependencies: string[] = [];
  for (const candidate of relativeCandidates) {
    if (candidate !== undefined) {
      relativeDependencies.push(candidate);
    }
  }

  return { packageImports: Array.from(packageImports), relativeDependencies };
}

/**
 * Retrieves scanned file info with promise-level caching to avoid reading
 * or preprocessing the same file multiple times.
 */
function getScannedFileInfo(
  filePath: string,
  fileCache: Map<string, Promise<ScannedFileInfo | undefined>>,
  resolutionCache: Map<string, Promise<string | undefined>>,
  directoryCache: Map<string, Promise<Set<string>>>,
): Promise<ScannedFileInfo | undefined> {
  let scanPromise = fileCache.get(filePath);
  if (!scanPromise) {
    scanPromise = scanFile(filePath, resolutionCache, directoryCache);
    fileCache.set(filePath, scanPromise);
  }

  return scanPromise;
}

/**
 * Recursively traverses a TypeScript file and its relative dependencies,
 * invoking a callback for every external or sibling package import found.
 *
 * @param filePath Absolute path to the file being scanned.
 * @param visited Set of already visited file paths to prevent infinite recursion.
 * @param fileCache Cache of preprocessed file imports and dependencies.
 * @param resolutionCache Cache of module candidate resolutions.
 * @param onImport Callback invoked for each encountered module import specifier.
 * @param directoryCache Optional cache of directory entries.
 */
export async function scanImports(
  filePath: string,
  visited: Set<string>,
  fileCache: Map<string, Promise<ScannedFileInfo | undefined>>,
  resolutionCache: Map<string, Promise<string | undefined>>,
  onImport: (importPath: string) => void,
  directoryCache = new Map<string, Promise<Set<string>>>(),
): Promise<void> {
  if (visited.has(filePath)) {
    return;
  }

  visited.add(filePath);

  const fileInfo = await getScannedFileInfo(filePath, fileCache, resolutionCache, directoryCache);
  if (!fileInfo) {
    return;
  }

  for (const importPath of fileInfo.packageImports) {
    onImport(importPath);
  }

  await Promise.all(
    fileInfo.relativeDependencies.map((depPath) =>
      scanImports(depPath, visited, fileCache, resolutionCache, onImport, directoryCache),
    ),
  );
}

/**
 * Scans an entry point's source files and returns all referenced sibling entry point names.
 *
 * @param entryPoint The normalized entry point to scan.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @param fileCache Cache of preprocessed file imports and dependencies.
 * @param resolutionCache Cache of module candidate resolutions.
 * @param directoryCache Cache of directory entries.
 * @returns An array of sibling entry point names referenced by this entry point.
 */
export async function scanEntryPointDependencies(
  entryPoint: NormalizedEntryPoint,
  packageName: string,
  fileCache: Map<string, Promise<ScannedFileInfo | undefined>>,
  resolutionCache: Map<string, Promise<string | undefined>>,
  directoryCache: Map<string, Promise<Set<string>>>,
): Promise<string[]> {
  const { name: epName, entryFilePath, isPrimary } = entryPoint;
  const visitedFiles = new Set<string>();
  const siblingDependencies: string[] = [];

  await scanImports(
    entryFilePath,
    visitedFiles,
    fileCache,
    resolutionCache,
    (importPath) => {
      if (importPath === packageName) {
        if (isPrimary) {
          throw new Error(`Entry point '.' has a circular dependency on itself.`);
        }

        siblingDependencies.push('.');
      } else if (importPath.startsWith(`${packageName}/`)) {
        const subpath = importPath.slice(packageName.length + 1);
        if (subpath === epName) {
          throw new Error(`Entry point '${epName}' has a circular dependency on itself.`);
        }

        siblingDependencies.push(subpath);
      }
    },
    directoryCache,
  );

  return siblingDependencies;
}
