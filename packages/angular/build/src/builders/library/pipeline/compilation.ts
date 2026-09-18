/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type PartialMessage, formatMessages } from 'esbuild';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type ts from 'typescript';
import type { AngularHostOptions } from '../../../tools/angular/angular-host';
import { LibraryCompilation } from '../../../tools/angular/compilation';
import { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { useTypeChecking } from '../../../utils/environment-options';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import { isDeclarationFile, isDeclarationSourceMapFile } from './utils';

const EMITTED_EXTENSIONS = [
  '.js',
  '.js.map',
  '.mjs',
  '.mjs.map',
  '.d.ts',
  '.d.ts.map',
  '.d.mts',
  '.d.mts.map',
] as const;

/**
 * Cached compilation instance for incremental rebuilds in watch mode.
 */
export interface CachedProgram {
  compilationInstance: LibraryCompilation;
  esmFiles: Map<string, string>;
  dtsFiles: Map<string, string>;
}

/**
 * In-memory compilation output containing emitted JavaScript and declaration files.
 */
export interface CompilationOutput {
  /** Map of emitted JavaScript files and sourcemaps keyed by absolute path. */
  esmFiles: Map<string, string>;

  /** Map of emitted declaration files and sourcemaps keyed by absolute path. */
  dtsFiles: Map<string, string>;

  /** Set of all referenced source, template, and stylesheet file paths. */
  referencedFiles: Set<string>;

  /** Whether declaration sourcemaps are enabled. */
  dtsSourcemap: boolean;

  /** Formatted compiler warning diagnostics, if any. */
  warnings?: string[];

  /** Whether any declaration files were added, modified, or removed in this compilation run. */
  hasDtsChanges: boolean;

  /** Whether any JavaScript or ESM files were added, modified, or removed in this compilation run. */
  hasEsmChanges: boolean;
}

/**
 * Result of compiling an entry point, including compilation output and updated program cache.
 */
export interface CompilationResult {
  compilation: CompilationOutput;
  cachedProgram?: CachedProgram;
}

/**
 * Interface representing the stylesheet bundler operations needed during compilation.
 */
export interface StylesheetBundlerAdapter {
  bundleFile: ComponentStylesheetBundler['bundleFile'];
  bundleInline: ComponentStylesheetBundler['bundleInline'];
}

export type CompileEntryPointOptions = Pick<
  NormalizedLibraryOptions,
  | 'compilationMode'
  | 'declarationMap'
  | 'packageName'
  | 'cacheOptions'
  | 'inlineStyleLanguage'
  | 'preserveSymlinks'
  | 'colors'
>;

/**
 * Compiles an entry point with the Angular Compiler (Ngtsc) and TypeScript using LibraryCompilation.
 * Emits JavaScript and .d.ts files into in-memory maps.
 *
 * @param entryPoint The normalized entry point to compile.
 * @param options The compilation options for this entry point.
 * @param stylesheetBundler The component stylesheet bundler instance or adapter.
 * @param upstreamDtsPaths Map of upstream entry point names to their emitted .d.ts file paths.
 * @param cachedProgram Cached program from a previous compilation run, if available.
 * @param modifiedFiles Set of modified file paths for incremental rebuilding in watch mode.
 * @returns The compilation result containing in-memory files, referenced file paths, and updated program cache.
 */
export async function compileEntryPoint(
  entryPoint: NormalizedEntryPoint,
  options: CompileEntryPointOptions,
  stylesheetBundler: StylesheetBundlerAdapter,
  upstreamDtsPaths: Record<string, string[]>,
  cachedProgram?: CachedProgram,
  modifiedFiles?: Set<string>,
  upstreamDtsFiles?: Map<string, string>,
  sourceFileCache?: Map<string, ts.SourceFile>,
): Promise<CompilationResult> {
  const { entryFilePath, tsConfigPath, bundleName } = entryPoint;
  const {
    compilationMode,
    declarationMap,
    cacheOptions,
    inlineStyleLanguage,
    preserveSymlinks,
    colors,
  } = options;
  const basePath = path.dirname(entryFilePath);

  const tsBuildInfoFile = cacheOptions.enabled
    ? path.join(cacheOptions.path, 'tsbuildinfo', `${bundleName}.tsbuildinfo`)
    : undefined;

  const compilationInstance =
    cachedProgram?.compilationInstance ??
    new LibraryCompilation({
      entryFilePath,
      compilationMode,
      declarationMap,
      upstreamDtsPaths,
      upstreamDtsFiles,
      basePath,
      tsBuildInfoFile,
      sourceFileCache,
    });

  if (cachedProgram) {
    compilationInstance.updateLibraryOptions({ upstreamDtsPaths, upstreamDtsFiles });
  }

  let stylesheetReferencedFiles: string[] = [];
  const stylesheetWarnings: PartialMessage[] = [];
  const hostOptions: AngularHostOptions = {
    modifiedFiles,
    transformStylesheet: async (data: string, containingFile: string, stylesheetFile?: string) => {
      const result = stylesheetFile
        ? await stylesheetBundler.bundleFile(stylesheetFile)
        : await stylesheetBundler.bundleInline(data, containingFile, inlineStyleLanguage);

      const {
        contents,
        referencedFiles: bundleReferencedFiles,
        errors: bundleErrors,
        warnings: bundleWarnings,
      } = result;

      if (bundleWarnings?.length) {
        stylesheetWarnings.push(...bundleWarnings);
      }

      if (bundleReferencedFiles?.size) {
        stylesheetReferencedFiles = [...bundleReferencedFiles];
      }

      if (bundleErrors?.length) {
        const errorMessages = bundleErrors.map((e) => e.text).join('\n');
        throw new Error(
          `Failed to bundle stylesheet in '${stylesheetFile ?? containingFile}':\n${errorMessages}`,
        );
      }

      return contents;
    },
    processWebWorker: () => '',
  };

  const { compilerOptions, referencedFiles } = await compilationInstance.initialize(
    tsConfigPath,
    hostOptions,
    {
      preserveSymlinks,
      cachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
    },
  );

  let formattedWarnings: string[] | undefined;
  if (useTypeChecking) {
    const { errors, warnings } = await compilationInstance.diagnoseFiles();
    if (errors?.length) {
      const errorMessages = await formatMessages(errors, { kind: 'error', color: colors });
      throw new Error(`Compilation failed with errors:\n${errorMessages.join('\n')}`);
    }

    if (warnings?.length) {
      formattedWarnings = await formatMessages(warnings, { kind: 'warning', color: colors });
    }
  }

  if (stylesheetWarnings.length > 0) {
    const formattedStyleWarnings = await formatMessages(stylesheetWarnings, {
      kind: 'warning',
      color: colors,
    });
    formattedWarnings = [...(formattedWarnings ?? []), ...formattedStyleWarnings];
  }

  const emittedFiles = compilationInstance.emitAffectedFiles();
  const esmFiles = new Map<string, string>(cachedProgram?.esmFiles);
  const dtsFiles = new Map<string, string>(cachedProgram?.dtsFiles);
  let hasDtsChanges = !cachedProgram;
  let hasEsmChanges = !cachedProgram;

  if (modifiedFiles) {
    for (const modifiedFile of modifiedFiles) {
      const posixModified = toPosixPath(modifiedFile);
      if (existsSync(posixModified)) {
        continue;
      }

      const basePathWithoutExt = posixModified.replace(/\.[cm]?[jt]sx?$/, '');
      for (const ext of EMITTED_EXTENSIONS) {
        const outputPath = `${basePathWithoutExt}${ext}`;

        if (esmFiles.delete(outputPath)) {
          hasEsmChanges = true;
        }

        if (dtsFiles.delete(outputPath)) {
          hasDtsChanges = true;
        }
      }
    }
  }

  for (const { filename, contents } of emittedFiles) {
    const normalized = toPosixPath(filename);
    const isDts = isDeclarationFile(normalized);
    const isDtsMap = !isDts && isDeclarationSourceMapFile(normalized);

    if (isDts || isDtsMap) {
      hasDtsChanges ||= dtsFiles.get(normalized) !== contents;
      dtsFiles.set(normalized, contents);
    } else {
      hasEsmChanges ||= esmFiles.get(normalized) !== contents;
      esmFiles.set(normalized, contents);
    }
  }

  return {
    compilation: {
      esmFiles,
      dtsFiles,
      referencedFiles: new Set([...referencedFiles, ...stylesheetReferencedFiles]),
      dtsSourcemap: !!compilerOptions.declarationMap,
      warnings: formattedWarnings,
      hasDtsChanges,
      hasEsmChanges,
    },
    cachedProgram: { compilationInstance, esmFiles, dtsFiles },
  };
}
