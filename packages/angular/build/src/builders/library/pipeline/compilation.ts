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
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import { isDeclarationFile, isDeclarationSourceMapFile } from './utils';

const EMITTED_EXTENSIONS = ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts'];

/**
 * Cached state for the single unified library compilation.
 */
export interface SingleProgramCache {
  readonly compilationInstance: AngularCompilation;
  readonly esmFiles: Map<string, string>;
  readonly dtsFiles: Map<string, string>;
  readonly failedFiles?: ReadonlySet<string>;
}

/**
 * Output of the unified library compilation step.
 */
export interface LibraryCompilationOutput {
  readonly esmFiles: ReadonlyMap<string, string>;
  readonly dtsFiles: ReadonlyMap<string, string>;
  readonly changedEsmFiles: ReadonlySet<string>;
  readonly changedDtsFiles: ReadonlySet<string>;
  readonly referencedFiles: ReadonlySet<string>;
  readonly cache: SingleProgramCache;
  readonly diagnosePromise: Promise<string[]>;
}

/**
 * Compiles all library entry points in a single TypeScript and Angular compilation pass.
 */
export async function compileLibrary(
  entryPoints: Iterable<NormalizedEntryPoint>,
  options: NormalizedLibraryOptions,
  stylesheetBundler: ComponentStylesheetBundler,
  cached?: SingleProgramCache,
  modifiedFiles?: Set<string>,
): Promise<LibraryCompilationOutput> {
  const { tsConfigPath, compilationMode, preserveSymlinks, colors, declarationMap } = options;

  const entryPathsMap: Record<string, string[]> = {};
  const rootFiles: string[] = [];
  for (const ep of entryPoints) {
    entryPathsMap[ep.displayName] = [ep.entryFilePath];
    rootFiles.push(ep.entryFilePath);
  }

  const compilationInstance =
    cached?.compilationInstance ?? (await createAngularCompilation('aot', false));

  try {
    let effectiveModifiedFiles = modifiedFiles;
    if (cached?.failedFiles?.size) {
      stylesheetBundler.invalidate(cached.failedFiles);
      effectiveModifiedFiles = new Set(modifiedFiles);
      for (const file of cached.failedFiles) {
        effectiveModifiedFiles.add(file);
      }
    }

    if (effectiveModifiedFiles && effectiveModifiedFiles.size > 0) {
      await compilationInstance.update?.(effectiveModifiedFiles);
    }

    const allReferencedFiles = new Set<string>();
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

        result.referencedFiles?.forEach((f) => allReferencedFiles.add(toPosixPath(f)));
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

    const { referencedFiles } = await compilationInstance.initialize(
      tsConfigPath,
      hostOptions,
      {
        sourcemap: true,
        preserveSymlinks,
        rootFiles,
        declarationMap,
        compilationMode,
        paths: entryPathsMap,
      },
      'library',
    );

    const emittedFiles =
      stylesheetErrors.length === 0 ? await compilationInstance.emitAffectedFiles() : [];
    const diagnosePromise = runDiagnosticsAndFormat(
      compilationInstance,
      stylesheetErrors,
      stylesheetWarnings,
      colors,
    );

    // Prevent unhandled promise rejection if an error occurs before diagnosePromise is awaited.
    diagnosePromise.catch(() => {});

    const esmFiles = cached?.esmFiles ?? new Map<string, string>();
    const dtsFiles = cached?.dtsFiles ?? new Map<string, string>();
    const changedEsmFiles = new Set<string>();
    const changedDtsFiles = new Set<string>();

    for (const ref of referencedFiles) {
      allReferencedFiles.add(toPosixPath(ref));
    }

    if (effectiveModifiedFiles) {
      for (const modifiedFile of effectiveModifiedFiles) {
        const posixModified = toPosixPath(modifiedFile);
        if (allReferencedFiles.has(posixModified)) {
          continue;
        }

        const basePathWithoutExt = posixModified.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
        if (basePathWithoutExt === posixModified || existsSync(posixModified)) {
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
      if (normalized.endsWith('.map')) {
        const isDtsMap = isDeclarationSourceMapFile(normalized);
        const targetMap = isDtsMap ? dtsFiles : esmFiles;
        if (targetMap.get(normalized) !== contents) {
          targetMap.set(normalized, contents);
          (isDtsMap ? changedDtsFiles : changedEsmFiles).add(normalized.slice(0, -4));
        }
      } else if (isDeclarationFile(normalized)) {
        if (dtsFiles.get(normalized) !== contents) {
          changedDtsFiles.add(normalized);
          dtsFiles.set(normalized, contents);
        }
      } else if (esmFiles.get(normalized) !== contents) {
        changedEsmFiles.add(normalized);
        esmFiles.set(normalized, contents);
      }
    }

    return {
      esmFiles,
      dtsFiles,
      changedEsmFiles,
      changedDtsFiles,
      referencedFiles: allReferencedFiles,
      cache: {
        compilationInstance,
        esmFiles,
        dtsFiles,
        failedFiles: failedFiles.size > 0 ? failedFiles : undefined,
      },
      diagnosePromise,
    };
  } catch (error) {
    if (!cached) {
      await compilationInstance.close?.();
    }
    throw error;
  }
}

async function runDiagnosticsAndFormat(
  compilationInstance: AngularCompilation,
  stylesheetErrors: PartialMessage[],
  stylesheetWarnings: PartialMessage[],
  colors: boolean,
): Promise<string[]> {
  if (stylesheetErrors.length > 0) {
    const formatted = await formatMessages(stylesheetErrors, { kind: 'error', color: colors });
    throw new Error(`Failed to bundle stylesheet:\n${formatted.join('\n')}`);
  }

  const warningsOut: string[] = [];

  if (useTypeChecking) {
    const { errors, warnings } = await compilationInstance.diagnoseFiles();
    if (errors?.length) {
      const errorMessages = await formatMessages(errors, { kind: 'error', color: colors });
      throw new Error(`Compilation failed with errors:\n${errorMessages.join('\n')}`);
    }

    if (warnings?.length) {
      const formatted = await formatMessages(warnings, { kind: 'warning', color: colors });
      warningsOut.push(...formatted);
    }
  }

  if (stylesheetWarnings.length > 0) {
    const formattedStyleWarnings = await formatMessages(stylesheetWarnings, {
      kind: 'warning',
      color: colors,
    });
    warningsOut.push(...formattedStyleWarnings);
  }

  return warningsOut;
}
