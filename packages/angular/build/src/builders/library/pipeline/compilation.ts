/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type PartialMessage, formatMessages } from 'esbuild';
import { access, constants } from 'node:fs/promises';
import {
  type AngularCompilation,
  DiagnosticModes,
  type EmitFileResult,
  createAngularCompilation,
} from '../../../tools/angular/compilation';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { useTypeChecking } from '../../../utils/environment-options';
import { assertIsError } from '../../../utils/error';
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

  const compilationInstance =
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
    }

    const stylesheetWarnings: PartialMessage[] = [];
    const stylesheetErrors: PartialMessage[] = [];
    const failedFiles = new Set<string>();
    const clearedReferenceFiles = new Set<string>();
    const clearPreviousReferencesOnce = (targetFile: string): void => {
      if (!cached) {
        return;
      }
      const posixTarget = toPosixPath(targetFile);
      if (!clearedReferenceFiles.has(posixTarget)) {
        clearedReferenceFiles.add(posixTarget);
        buildState.clearFileReferences([posixTarget]);
      }
    };

    const hostOptions = {
      modifiedFiles: effectiveModifiedFiles,
      async transformStylesheet(
        data: string,
        containingFile: string,
        stylesheetFile?: string,
      ): Promise<string> {
        const result = stylesheetFile
          ? await stylesheetBundler.bundleFile(stylesheetFile)
          : await stylesheetBundler.bundleInline(
              data,
              containingFile,
              containingFile.endsWith('.html') ? 'css' : undefined,
            );

        if (result.warnings.length > 0) {
          stylesheetWarnings.push(...result.warnings);
        }

        const referenceTarget = stylesheetFile ?? containingFile;

        if (result.errors?.length) {
          if (result.referencedFiles) {
            buildState.addFileReferences(referenceTarget, result.referencedFiles);
          }

          stylesheetErrors.push(...result.errors);
          failedFiles.add(toPosixPath(containingFile));
          if (stylesheetFile) {
            failedFiles.add(toPosixPath(stylesheetFile));
          }

          return '';
        }

        clearPreviousReferencesOnce(referenceTarget);

        if (result.referencedFiles) {
          buildState.addFileReferences(referenceTarget, result.referencedFiles);
        }

        return result.contents;
      },
      processWebWorker: () => '',
    };

    const {
      referencedFiles,
      compilerOptions,
      warnings: initWarnings,
    } = await compilationInstance.initialize(
      tsConfigPath,
      hostOptions,
      {
        sourcemap: true,
        preserveSymlinks,
        rootFiles,
        declarationMap,
        compilationMode,
        paths: entryPathsMap,
        cachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
      },
      'library',
    );

    if (initWarnings?.length) {
      stylesheetWarnings.unshift(...initWarnings);
    }

    const hasStylesheetErrors = stylesheetErrors.length > 0;
    const emittedFiles = hasStylesheetErrors ? [] : await compilationInstance.emitAffectedFiles();
    const diagnosePromise = runDiagnosticsAndFormat(
      compilationInstance,
      stylesheetErrors,
      stylesheetWarnings,
      colors,
      buildState,
    );

    const esmFiles = cached?.esmFiles ?? new Map<string, string>();
    const dtsFiles = cached?.dtsFiles ?? new Map<string, string>();
    const posixReferencedFiles = new Set(referencedFiles.map(toPosixPath));
    const { changedEsmFiles, changedDtsFiles } = await updateEmittedFileCaches(
      emittedFiles,
      esmFiles,
      dtsFiles,
      posixReferencedFiles,
      cached ? effectiveModifiedFiles : undefined,
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
      declarationMap: !!compilerOptions.declarationMap,
      compilationMode: compilerOptions.compilationMode === 'full' ? 'full' : 'partial',
    };
  } catch (error) {
    if (!cached) {
      await compilationInstance.close?.();
    }
    throw error;
  }
}

/**
 * Updates the in-memory ESM and DTS file maps with newly emitted files and prunes deleted
 * source files, returning the sets of changed ESM and DTS file paths.
 *
 * @param emittedFiles Newly emitted files from the Angular compilation.
 * @param esmFiles In-memory map of POSIX ESM file paths to contents.
 * @param dtsFiles In-memory map of POSIX declaration file paths to contents.
 * @param posixReferencedFiles Set of POSIX file paths currently referenced by the program.
 * @param modifiedFiles Optional set of modified POSIX file paths in incremental builds.
 * @returns A promise resolving to the sets of changed ESM and DTS file paths.
 */
async function updateEmittedFileCaches(
  emittedFiles: Iterable<EmitFileResult>,
  esmFiles: Map<string, string>,
  dtsFiles: Map<string, string>,
  posixReferencedFiles: ReadonlySet<string>,
  modifiedFiles?: ReadonlySet<string>,
): Promise<{ changedEsmFiles: Set<string>; changedDtsFiles: Set<string> }> {
  const changedEsmFiles = new Set<string>();
  const changedDtsFiles = new Set<string>();

  const removalChecks: Promise<void>[] = [];
  for (const modifiedFile of modifiedFiles ?? []) {
    if (posixReferencedFiles.has(modifiedFile)) {
      continue;
    }

    const basePathWithoutExt = modifiedFile.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
    if (basePathWithoutExt === modifiedFile) {
      continue;
    }

    removalChecks.push(
      access(modifiedFile, constants.F_OK).then(
        () => {},
        () => {
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
        },
      ),
    );
  }
  if (removalChecks.length > 0) {
    await Promise.all(removalChecks);
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

  return { changedEsmFiles, changedDtsFiles };
}

/**
 * Formats stylesheet bundling diagnostics and TypeScript/Angular diagnostics
 * and records them on the build state's execution result.
 *
 * @param compilationInstance The active Angular compilation instance.
 * @param stylesheetErrors List of stylesheet bundling errors.
 * @param stylesheetWarnings List of initialization and stylesheet bundling warnings.
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

  try {
    const diagnostics = await compilationInstance.diagnoseFiles(
      useTypeChecking ? DiagnosticModes.All : DiagnosticModes.All & ~DiagnosticModes.Semantic,
    );
    if (diagnostics.errors?.length) {
      errors.push(...diagnostics.errors);
    }
    if (diagnostics.warnings?.length) {
      warnings.push(...diagnostics.warnings);
    }
  } catch (error) {
    assertIsError(error);
    errors.push({
      text: error.message,
      location: null,
    });
  }

  warnings.push(...stylesheetWarnings);

  try {
    if (errors.length > 0) {
      executionResult.addErrors(await formatMessages(errors, { kind: 'error', color: colors }));
    }

    if (warnings.length > 0) {
      executionResult.addWarnings(
        await formatMessages(warnings, { kind: 'warning', color: colors }),
      );
    }
  } catch (error) {
    assertIsError(error);
    executionResult.addError(error.message);
  }
}
