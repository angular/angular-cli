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
import type ts from 'typescript';
import { emitFilesToDisk } from '../../../tools/esbuild/utils';
import { runConcurrent } from '../../../utils/concurrency';
import { maxWorkers } from '../../../utils/environment-options';
import { toPosixPath } from '../../../utils/path';
import type { WorkerPool } from '../../../utils/worker-pool';
import type { NormalizedLibraryOptions, PackageJsonData } from '../options';
import { collectAssetsToEmit } from './assets';
import { type BundleResult, bundleEntryPoint } from './bundler';
import { type CompilationOutput, compileEntryPoint } from './compilation';
import { compileEntryPointInWorker } from './compiler-worker';
import { type EntryPointGraph, type EntryPointNode } from './entry-point-graph';
import { generatePackageManifests } from './package-manifests';
import type { createComponentStylesheetBundlerForLibrary } from './stylesheet-bundler';
import { type OutputFile, getFileText, isDeclarationFile } from './utils';

/**
 * Context object containing all dependencies and state required to execute a build action.
 */
export interface BuildActionContext {
  options: NormalizedLibraryOptions;
  graph: EntryPointGraph;
  batches: EntryPointNode[][];
  stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>;
  allWatchedFiles: Set<string>;
  isWatchMode: boolean;
  context: BuilderContext;
  compilerWorkerPool?: WorkerPool;
  modifiedFiles?: Set<string>;
  signal?: AbortSignal;
  target: string[];
  sourceFileCache?: Map<string, ts.SourceFile>;
}

/**
 * Core build pipeline that executes compilation, bundling, package.json generation, and asset copying.
 *
 * @param actionContext The build action context containing options, graph, and dependencies.
 */
export async function buildAction(actionContext: BuildActionContext): Promise<void> {
  const {
    options,
    graph,
    batches,
    stylesheetBundler,
    allWatchedFiles,
    isWatchMode,
    context,
    compilerWorkerPool,
    modifiedFiles,
    signal,
    target,
    sourceFileCache,
  } = actionContext;

  signal?.throwIfAborted?.();

  const {
    outputPath,
    assets,
    workspaceRoot,
    packageJson: rawPackageJson,
    allowedNonPeerDependencies,
    packageJsonPath,
  } = options;

  // Validate allowed non-peer dependencies
  validateDependencies(rawPackageJson, allowedNonPeerDependencies);

  // Collect cached declaration files across all entry points in the graph.
  // This provides in-memory declaration file access for incremental builds.
  const upstreamDtsFiles = collectCachedDtsFiles(graph, outputPath);
  const filesToEmit: OutputFile[] = [];
  const successfulBundles: Array<{ node: EntryPointNode; bundleResult: BundleResult }> = [];

  // Process batches in topological order. Within each batch, entry points are compiled concurrently up to maxWorkers.
  for (const batch of batches) {
    signal?.throwIfAborted?.();

    await runConcurrent(batch, maxWorkers, async (node) => {
      signal?.throwIfAborted?.();

      const { entryPoint, isDirty } = node;
      if (!isDirty) {
        return;
      }

      const epStartTime = process.hrtime.bigint();
      const { displayName, entryFilePath } = entryPoint;

      context.logger.info(`Compiling ${displayName}...`);

      try {
        let compilation: CompilationOutput;
        // In watch mode, compilation runs on the main thread to reuse the in-memory incremental
        // program cache (`node.cachedProgram`). TypeScript Program and compiler instances contain
        // ASTs, closures, and circular references that cannot be serialized or transferred across
        // worker threads via structured clone (`postMessage`).
        if (compilerWorkerPool && !isWatchMode) {
          compilation = await compileEntryPointInWorker(
            compilerWorkerPool,
            entryPoint,
            options,
            target,
            graph.upstreamDtsPaths,
            upstreamDtsFiles,
            modifiedFiles ? Array.from(modifiedFiles) : undefined,
          );
        } else {
          const result = await compileEntryPoint(
            entryPoint,
            options,
            stylesheetBundler,
            graph.upstreamDtsPaths,
            node.cachedProgram,
            modifiedFiles,
            upstreamDtsFiles,
            sourceFileCache,
          );
          compilation = result.compilation;
          node.cachedProgram = result.cachedProgram;
        }

        if (compilation.warnings?.length) {
          for (const warning of compilation.warnings) {
            context.logger.warn(warning);
          }
        }

        // Track referenced source files for watch mode
        node.referencedFiles.clear();
        for (const ref of compilation.referencedFiles) {
          node.referencedFiles.add(toPosixPath(ref));
        }

        // Bundle compiled JavaScript and declaration files with Rolldown
        const bundleResult = await bundleEntryPoint(
          entryPoint,
          compilation,
          options,
          node.lastBundleResult,
        );

        filesToEmit.push(...bundleResult.filesToEmit);

        for (const file of bundleResult.files) {
          if (isDeclarationFile(file.path)) {
            const posixPath = toPosixPath(path.join(outputPath, file.path));
            const text = getFileText(file.contents);
            upstreamDtsFiles.set(posixPath, text);
            if (sourceFileCache && sourceFileCache.get(posixPath)?.text !== text) {
              sourceFileCache.delete(posixPath);
            }
          }
        }

        // Invalidate downstream dependents if the public type declarations changed
        if (node.lastDtsHash !== bundleResult.dtsHash) {
          for (const dependent of node.dependents) {
            dependent.isDirty = true;
          }
        }
        node.lastDtsHash = bundleResult.dtsHash;
        successfulBundles.push({ node, bundleResult });

        const epDuration = Number(process.hrtime.bigint() - epStartTime) / 10 ** 9;
        context.logger.info(`Compiled ${displayName} [${epDuration.toFixed(3)} seconds]`);
      } finally {
        // Ensure referenced files are watched even if compilation or bundling fails
        for (const ref of node.referencedFiles) {
          allWatchedFiles.add(ref);
        }
        allWatchedFiles.add(entryFilePath);
      }
    });
  }

  signal?.throwIfAborted?.();

  // Copy assets if configured (collectAssetsToEmit handles incremental filtering in watch mode)
  if (assets.length > 0) {
    const resolvedAssets = await collectAssetsToEmit(
      assets,
      workspaceRoot,
      allWatchedFiles,
      modifiedFiles,
    );

    filesToEmit.push(...resolvedAssets);
  }

  // Generate package.json and .npmignore files only on initial build or when package.json was modified.
  if (!modifiedFiles || modifiedFiles.has(toPosixPath(packageJsonPath))) {
    const manifestFiles = await generatePackageManifests(options, graph, isWatchMode);
    filesToEmit.push(...manifestFiles);
  }

  // Emit all files (FESM, DTS, sourcemaps, assets, package.json manifests, .npmignore) with a single emitFilesToDisk call
  if (filesToEmit.length > 0) {
    signal?.throwIfAborted?.();
    await emitOutputsToDisk(outputPath, filesToEmit);
  }

  for (const { node, bundleResult } of successfulBundles) {
    node.lastBundleResult = bundleResult;
    node.isDirty = false;
  }
}

async function emitOutputsToDisk(
  outputPath: string,
  filesToEmit: readonly OutputFile[],
): Promise<void> {
  const createdDirectories = new Set<string>();
  const directoryCreationPromises = new Map<string, Promise<void>>();

  await emitFilesToDisk(filesToEmit, async (file) => {
    const isInMemoryFile = file.type === 'memory';
    const dest = path.join(outputPath, isInMemoryFile ? file.path : file.destination);
    const destDir = path.dirname(dest);

    if (!createdDirectories.has(destDir)) {
      let createPromise = directoryCreationPromises.get(destDir);
      if (!createPromise) {
        createPromise = fs
          .mkdir(destDir, { recursive: true })
          .then(() => {
            let current = destDir;
            while (current) {
              createdDirectories.add(current);
              const parent = path.dirname(current);
              if (parent === current || createdDirectories.has(parent)) {
                break;
              }
              current = parent;
            }
          })
          .finally(() => {
            directoryCreationPromises.delete(destDir);
          });

        directoryCreationPromises.set(destDir, createPromise);
      }

      await createPromise;
    }

    if (isInMemoryFile) {
      await fs.writeFile(dest, file.contents);
    } else {
      await fs.copyFile(file.source, dest, fs.constants.COPYFILE_FICLONE);
    }
  });
}

/**
 * Collects bundled declaration files from previous build runs across the graph
 * to seed the in-memory declaration file cache for downstream dependency resolution.
 *
 * @param graph The entry point dependency graph.
 * @returns A map of POSIX declaration file paths to their text contents.
 */
function collectCachedDtsFiles(graph: EntryPointGraph, outputPath: string): Map<string, string> {
  const upstreamDtsFiles = new Map<string, string>();

  for (const node of graph.nodes.values()) {
    if (!node.lastBundleResult) {
      continue;
    }

    for (const file of node.lastBundleResult.files) {
      if (isDeclarationFile(file.path)) {
        upstreamDtsFiles.set(
          toPosixPath(path.join(outputPath, file.path)),
          getFileText(file.contents),
        );
      }
    }
  }

  return upstreamDtsFiles;
}

/**
 * Validate that the package.json dependencies only contain allowed dependencies.
 * @param pkg The package.json data.
 * @param allowedPatterns Array of regex patterns for allowed dependencies.
 */
function validateDependencies(pkg: PackageJsonData, allowedPatterns: RegExp[]): void {
  const { dependencies } = pkg;
  if (!dependencies) {
    return;
  }

  const invalidDeps: string[] = [];

  for (const dep of Object.keys(dependencies)) {
    if (dep === 'tslib') {
      continue;
    }

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(dep));
    if (!isAllowed) {
      invalidDeps.push(dep);
    }
  }

  if (invalidDeps.length > 0) {
    throw new Error(
      `Package.json contains dependencies not listed in 'allowedNonPeerDependencies': ${invalidDeps.join(', ')}. ` +
        `Third-party dependencies must usually be 'peerDependencies' in Angular libraries.`,
    );
  }
}
