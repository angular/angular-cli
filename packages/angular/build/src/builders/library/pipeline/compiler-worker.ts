/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { initializeHash } from '../../../utils/hash';
import { toPosixPath } from '../../../utils/path';
import type { WorkerPool } from '../../../utils/worker-pool';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import {
  type CompilationOutput,
  type CompileEntryPointOptions,
  compileEntryPoint,
} from './compilation';
import { createComponentStylesheetBundlerForLibrary } from './stylesheet-bundler';

export type CompileWorkerOptions = CompileEntryPointOptions & {
  workspaceRoot: string;
  styleIncludePaths: string[];
  sass?: NormalizedLibraryOptions['sass'];
  postcssConfiguration?: NormalizedLibraryOptions['postcssConfiguration'];
  tailwindConfiguration?: NormalizedLibraryOptions['tailwindConfiguration'];
  target: string[];
};

export interface CompileWorkerRequest {
  entryPoint: NormalizedEntryPoint;
  options: CompileWorkerOptions;
  upstreamDtsPaths: Record<string, string[]>;
  upstreamDtsFiles?: Map<string, string>;
  modifiedFiles?: string[];
}

export type CompileWorkerResponse = CompilationOutput;

/**
 * Compiles a library entry point in a worker thread.
 *
 * @param request The compilation request payload.
 * @returns The serialized compilation output.
 */
export default async function compile(
  request: CompileWorkerRequest,
): Promise<CompileWorkerResponse> {
  await initializeHash();

  const { entryPoint, options, upstreamDtsPaths, upstreamDtsFiles, modifiedFiles } = request;
  const stylesheetBundler = createComponentStylesheetBundlerForLibrary(
    options,
    /* incremental */ false,
    options.target,
  );

  try {
    const { compilation } = await compileEntryPoint(
      entryPoint,
      options,
      stylesheetBundler,
      upstreamDtsPaths,
      undefined,
      modifiedFiles ? new Set(modifiedFiles) : undefined,
      upstreamDtsFiles,
    );

    const referencedFiles = new Set<string>();
    for (const file of compilation.referencedFiles) {
      referencedFiles.add(toPosixPath(file));
    }

    return {
      esmFiles: compilation.esmFiles,
      dtsFiles: compilation.dtsFiles,
      referencedFiles,
      dtsSourcemap: compilation.dtsSourcemap,
      warnings: compilation.warnings,
      hasDtsChanges: compilation.hasDtsChanges,
      hasEsmChanges: compilation.hasEsmChanges,
    };
  } finally {
    await stylesheetBundler.dispose();
  }
}

/**
 * Compiles an entry point in a worker thread using the provided worker pool.
 *
 * @param workerPool The worker pool instance.
 * @param entryPoint The normalized entry point to compile.
 * @param options The normalized library options.
 * @param target The esbuild target environments derived from browserslist.
 * @param upstreamDtsPaths Map of upstream entry point declaration file paths.
 * @param modifiedFiles Optional array of modified file paths for watch mode.
 * @returns The compilation output.
 */
export async function compileEntryPointInWorker(
  workerPool: WorkerPool,
  entryPoint: NormalizedEntryPoint,
  options: NormalizedLibraryOptions,
  target: string[],
  upstreamDtsPaths: Record<string, string[]>,
  upstreamDtsFiles?: Map<string, string>,
  modifiedFiles?: string[],
): Promise<CompilationOutput> {
  const workerOptions: CompileWorkerOptions = {
    tsConfigPath: options.tsConfigPath,
    compilationMode: options.compilationMode,
    declarationMap: options.declarationMap,
    packageName: options.packageName,
    cacheOptions: options.cacheOptions,
    inlineStyleLanguage: options.inlineStyleLanguage,
    preserveSymlinks: options.preserveSymlinks,
    colors: options.colors,
    workspaceRoot: options.workspaceRoot,
    styleIncludePaths: options.styleIncludePaths,
    sass: options.sass,
    postcssConfiguration: options.postcssConfiguration,
    tailwindConfiguration: options.tailwindConfiguration,
    target,
  };

  const compilationResponse = (await workerPool.run({
    entryPoint,
    options: workerOptions,
    upstreamDtsPaths,
    upstreamDtsFiles,
    modifiedFiles,
  })) as CompileWorkerResponse;

  return compilationResponse;
}
