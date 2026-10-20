/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type PartialMessage, formatMessages } from 'esbuild';
import { existsSync } from 'node:fs';
import {
  type AngularCompilation,
  createAngularCompilation,
} from '../../../tools/angular/compilation';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { useTypeChecking } from '../../../utils/environment-options';
import { toPosixPath } from '../../../utils/path';
import type { BuilderState } from '../builder-state';
import type { LibraryCompilationOutput, NormalizedLibraryOptions } from '../types';
import { isDeclarationFile, isDeclarationSourceMapFile } from './utils';

const EMITTED_EXTENSIONS = ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts'];

/**
 * Compiles all library entry points in a single TypeScript and Angular compilation pass.
 *
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param buildState The build state tracking compilation caches, file references, and diagnostics.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental compilation.
 * @returns A promise resolving to the compilation output containing emitted files and cache state.
 */
export async function compileLibrary(
  options: NormalizedLibraryOptions,
  stylesheetBundler: ComponentStylesheetBundler,
  buildState: BuilderState,
  modifiedFiles?: Set<string>,
): Promise<LibraryCompilationOutput> {
  const {
    tsConfigPath,
    entryPoints,
    compilationMode,
    preserveSymlinks,
    colors,
    declarationMap,
    cacheOptions,
  } = options;
  const cached = buildState.singleProgramCache;

  const entryPathsMap: Record<string, string[]> = {};
  const rootFiles: string[] = [];
  for (const ep of entryPoints.values()) {
    entryPathsMap[ep.displayName] = [ep.entryFilePath];
    rootFiles.push(ep.entryFilePath);
  }

  let compilationInstance =
    cached?.compilationInstance ?? (await createAngularCompilation('aot', false));

  try {
    let effectiveModifiedFiles = modifiedFiles;
    if (cached && cached.failedFiles.size > 0) {
      stylesheetBundler.invalidate(cached.failedFiles);
      const merged = new Set(modifiedFiles);
      for (const file of cached.failedFiles) {
        merged.add(file);
      }
      effectiveModifiedFiles = merged;
    }

    if (effectiveModifiedFiles && effectiveModifiedFiles.size > 0) {
      await compilationInstance.update?.(effectiveModifiedFiles);
      buildState.clearFileReferences(effectiveModifiedFiles);
    }

    const stylesheetWarnings: PartialMessage[] = [];
    const stylesheetErrors: PartialMessage[] = [];
    const failedFiles = new Set<string>();

    const hostOptions = {
      modifiedFiles: effectiveModifiedFiles,
      async transformStylesheet(
        data: string,
        containingFile: string,
        stylesheetFile?: string,
      ): Promise<string> {
        const result = stylesheetFile
          ? await stylesheetBundler.bundleFile(stylesheetFile)
          : await stylesheetBundler.bundleInline(data, containingFile);

        if (result.referencedFiles) {
          buildState.addFileReferences(containingFile, result.referencedFiles);
          if (stylesheetFile) {
            buildState.addFileReferences(stylesheetFile, result.referencedFiles);
          }
        }

        if (result.warnings.length > 0) {
          stylesheetWarnings.push(...result.warnings);
        }

        if (result.errors?.length) {
          stylesheetErrors.push(...result.errors);
          failedFiles.add(toPosixPath(containingFile));
          if (stylesheetFile) {
            failedFiles.add(toPosixPath(stylesheetFile));
          }

          return '';
        }

        return result.contents;
      },
      processWebWorker: () => '',
    };

    const compilerOptionOverrides = {
      sourcemap: true,
      preserveSymlinks,
      rootFiles,
      declarationMap,
      compilationMode,
      paths: entryPathsMap,
      cachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
    };

    let { referencedFiles, compilerOptions } = await compilationInstance.initialize(
      tsConfigPath,
      hostOptions,
      compilerOptionOverrides,
      'library',
    );

    const effectiveCompilationMode =
      compilerOptions.compilationMode === 'full' ? 'full' : 'partial';
    const hasCompilationModeChanged =
      buildState.compilationMode !== undefined &&
      buildState.compilationMode !== effectiveCompilationMode;

    if (hasCompilationModeChanged && cached) {
      await compilationInstance.close?.();
      compilationInstance = await createAngularCompilation('aot', false);
      hostOptions.modifiedFiles = undefined;
      stylesheetWarnings.length = 0;
      stylesheetErrors.length = 0;
      failedFiles.clear();
      ({ referencedFiles, compilerOptions } = await compilationInstance.initialize(
        tsConfigPath,
        hostOptions,
        compilerOptionOverrides,
        'library',
      ));
    }

    const effectiveDeclarationMap = !!compilerOptions.declarationMap;
    const hasStylesheetErrors = stylesheetErrors.length > 0;
    const emittedFiles = hasStylesheetErrors ? [] : await compilationInstance.emitAffectedFiles();
    const diagnosePromise = runDiagnosticsAndFormat(
      compilationInstance,
      stylesheetErrors,
      stylesheetWarnings,
      colors,
      buildState,
    );

    const posixReferencedFiles = new Set(referencedFiles.map(toPosixPath));
    const { esmFiles, dtsFiles, changedEsmFiles, changedDtsFiles } = updateEmittedFileMaps(
      emittedFiles,
      cached,
      posixReferencedFiles,
      effectiveModifiedFiles,
      hasCompilationModeChanged,
    );

    return {
      esmFiles,
      dtsFiles,
      changedEsmFiles,
      changedDtsFiles,
      referencedFiles: posixReferencedFiles,
      cache: {
        compilationInstance,
        esmFiles,
        dtsFiles,
        failedFiles,
      },
      hasStylesheetErrors,
      diagnosePromise,
      declarationMap: effectiveDeclarationMap,
      compilationMode: effectiveCompilationMode,
    };
  } catch (error) {
    if (!cached || compilationInstance !== cached.compilationInstance) {
      await compilationInstance.close?.();
    }
    throw error;
  }
}

/**
 * Updates cached in-memory ESM and DTS maps with newly emitted files and prunes deleted files.
 */
function updateEmittedFileMaps(
  emittedFiles: Iterable<{ filename: string; contents: string }>,
  cached: BuilderState['singleProgramCache'],
  posixReferencedFiles: ReadonlySet<string>,
  effectiveModifiedFiles: ReadonlySet<string> | undefined,
  hasCompilationModeChanged: boolean,
): {
  esmFiles: Map<string, string>;
  dtsFiles: Map<string, string>;
  changedEsmFiles: Set<string>;
  changedDtsFiles: Set<string>;
} {
  const esmFiles = cached?.esmFiles ?? new Map<string, string>();
  const dtsFiles = cached?.dtsFiles ?? new Map<string, string>();
  if (hasCompilationModeChanged) {
    esmFiles.clear();
    dtsFiles.clear();
  }

  const changedEsmFiles = new Set<string>();
  const changedDtsFiles = new Set<string>();

  if (cached && !hasCompilationModeChanged && effectiveModifiedFiles) {
    for (const modifiedFile of effectiveModifiedFiles) {
      if (posixReferencedFiles.has(modifiedFile)) {
        continue;
      }

      const basePathWithoutExt = modifiedFile.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
      if (basePathWithoutExt === modifiedFile || existsSync(modifiedFile)) {
        continue;
      }

      for (const ext of EMITTED_EXTENSIONS) {
        const outputPath = `${basePathWithoutExt}${ext}`;
        const mapPath = `${outputPath}.map`;
        if (esmFiles.delete(outputPath)) {
          changedEsmFiles.add(outputPath);
        }
        if (dtsFiles.delete(outputPath)) {
          changedDtsFiles.add(outputPath);
        }
        esmFiles.delete(mapPath);
        dtsFiles.delete(mapPath);
      }
    }
  }

  for (const { filename, contents } of emittedFiles) {
    const normalized = toPosixPath(filename);
    const isMap = normalized.endsWith('.map');
    const isDts = isMap ? isDeclarationSourceMapFile(normalized) : isDeclarationFile(normalized);
    const targetFiles = isDts ? dtsFiles : esmFiles;

    if (targetFiles.get(normalized) !== contents) {
      targetFiles.set(normalized, contents);
      (isDts ? changedDtsFiles : changedEsmFiles).add(isMap ? normalized.slice(0, -4) : normalized);
    }
  }

  return { esmFiles, dtsFiles, changedEsmFiles, changedDtsFiles };
}

/**
 * Formats stylesheet bundling diagnostics and TypeScript/Angular diagnostics
 * and records them on the build state's execution result.
 *
 * @param compilationInstance The active Angular compilation instance.
 * @param stylesheetErrors List of stylesheet bundling errors.
 * @param stylesheetWarnings List of stylesheet bundling warnings.
 * @param colors Whether diagnostic messages should be formatted with ANSI colors.
 * @param buildState The build state whose execution result receives the formatted diagnostics.
 */
async function runDiagnosticsAndFormat(
  compilationInstance: AngularCompilation,
  stylesheetErrors: PartialMessage[],
  stylesheetWarnings: PartialMessage[],
  colors: boolean,
  buildState: BuilderState,
): Promise<void> {
  const { executionResult } = buildState;
  const errors = [...stylesheetErrors];
  const warnings: PartialMessage[] = [];

  if (errors.length === 0 && useTypeChecking) {
    const diagnostics = await compilationInstance.diagnoseFiles();
    if (diagnostics.errors?.length) {
      errors.push(...diagnostics.errors);
    }
    if (diagnostics.warnings?.length) {
      warnings.push(...diagnostics.warnings);
    }
  }

  warnings.push(...stylesheetWarnings);

  if (errors.length > 0) {
    executionResult.addErrors(await formatMessages(errors, { kind: 'error', color: colors }));
  }

  if (warnings.length > 0) {
    executionResult.addWarnings(await formatMessages(warnings, { kind: 'warning', color: colors }));
  }
}
