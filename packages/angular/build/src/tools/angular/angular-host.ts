/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import assert from 'node:assert';
import nodePath from 'node:path';
import type ts from 'typescript';
import { calculateHash } from '../../utils/hash';

export type AngularCompilerOptions = ng.CompilerOptions;
export type AngularCompilerHost = ng.CompilerHost;

export interface AngularHostOptions {
  fileReplacements?: Record<string, string>;
  modifiedFiles?: Set<string>;
  externalStylesheets?: Map<string, string>;
  transformStylesheet(
    data: string,
    containingFile: string,
    stylesheetFile?: string,
    order?: number,
    className?: string,
  ): Promise<string | null>;
  processWebWorker(workerFile: string, containingFile: string): string;
}

/**
 * Ensures that all `SourceFile` instances in a TypeScript `Program` have a `version`
 * field. The `version` field is required when used with a TypeScript `BuilderProgram`.
 * @param program The TypeScript Program instance.
 * @param previousProgram Optional previous BuilderProgram to reuse existing source file versions.
 */
export function ensureSourceFileVersions(
  program: ts.Program,
  previousProgram?: ts.BuilderProgram,
): void {
  // TODO: Update Angular compiler to add versions to all internal files and remove this
  const files: readonly (ts.SourceFile & { version?: string })[] = program.getSourceFiles();

  for (const file of files) {
    if (file.version === undefined) {
      const previousFile: (ts.SourceFile & { version?: string }) | undefined =
        previousProgram && !file.fileName.endsWith('.ngtypecheck.ts')
          ? previousProgram.getSourceFile(file.fileName)
          : undefined;
      file.version = previousFile?.version ?? calculateHash(file.text);
    }
  }
}

function augmentHostWithCaching(host: ts.CompilerHost, cache: Map<string, ts.SourceFile>): void {
  const baseGetSourceFile = host.getSourceFile;
  host.getSourceFile = function (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
    ...parameters
  ) {
    if (!shouldCreateNewSourceFile && cache.has(fileName)) {
      return cache.get(fileName);
    }

    const file = baseGetSourceFile.call(
      host,
      fileName,
      languageVersion,
      onError,
      true,
      ...parameters,
    );

    if (file) {
      cache.set(fileName, file);
    }

    return file;
  };
}

function augmentResolveModuleNames(
  typescript: typeof ts,
  host: ts.CompilerHost,
  resolvedModuleModifier: (
    resolvedModule: ts.ResolvedModuleFull | undefined,
    moduleName: string,
  ) => ts.ResolvedModuleFull | undefined,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  if (host.resolveModuleNameLiterals) {
    const baseResolveModuleNameLiterals = host.resolveModuleNameLiterals;
    host.resolveModuleNameLiterals = function (moduleLiterals, ...parameters) {
      return moduleLiterals.map((name) => {
        const result = baseResolveModuleNameLiterals.call(host, [name], ...parameters);

        return {
          ...result[0],
          resolvedModule: resolvedModuleModifier(result[0].resolvedModule, name.text),
        };
      });
    };
  } else {
    host.resolveModuleNameLiterals = function (
      moduleLiterals,
      containingFile,
      redirectedReference,
      options,
      containingSourceFile,
    ) {
      return moduleLiterals.map((name) => {
        const result = typescript.resolveModuleName(
          name.text,
          containingFile,
          options,
          host,
          moduleResolutionCache,
          redirectedReference,
          containingSourceFile.impliedNodeFormat,
        );

        return {
          ...result,
          resolvedModule: resolvedModuleModifier(result.resolvedModule, name.text),
        };
      });
    };
  }
}

function normalizePath(path: string): string {
  return nodePath.win32.normalize(path).replace(/\\/g, nodePath.posix.sep);
}

function augmentHostWithReplacements(
  typescript: typeof ts,
  host: ts.CompilerHost,
  replacements: Record<string, string>,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  if (Object.keys(replacements).length === 0) {
    return;
  }

  const normalizedReplacements: Record<string, string> = {};
  for (const [key, value] of Object.entries(replacements)) {
    normalizedReplacements[normalizePath(key)] = normalizePath(value);
  }

  const tryReplace = (
    resolvedModule: ts.ResolvedModuleFull | undefined,
  ): ts.ResolvedModuleFull | undefined => {
    const replacement = resolvedModule && normalizedReplacements[resolvedModule.resolvedFileName];
    if (replacement) {
      return {
        ...resolvedModule,
        resolvedFileName: replacement,
        isExternalLibraryImport: /[/\\]node_modules[/\\]/.test(replacement),
      };
    } else {
      return resolvedModule;
    }
  };

  augmentResolveModuleNames(typescript, host, tryReplace, moduleResolutionCache);
}

export function createAngularCompilerHost(
  typescript: typeof ts,
  compilerOptions: AngularCompilerOptions,
  hostOptions: AngularHostOptions,
  packageJsonCache: ts.PackageJsonInfoCache | undefined,
  sourceFileCache?: Map<string, ts.SourceFile>,
): AngularCompilerHost {
  // Create TypeScript compiler host
  const host: AngularCompilerHost = typescript.createIncrementalCompilerHost(compilerOptions);
  // Set the parsing mode to the same as TS 5.3+ default for tsc. This provides a parse
  // performance improvement by skipping non-type related JSDoc parsing.
  host.jsDocParsingMode = typescript.JSDocParsingMode.ParseForTypeErrors;

  // The AOT compiler currently requires this hook to allow for a transformResource hook.
  // Once the AOT compiler allows only a transformResource hook, this can be reevaluated.
  host.readResource = async function (filename) {
    return this.readFile(filename) ?? '';
  };

  // Add an AOT compiler resource transform hook
  host.transformResource = async function (data, context) {
    // Only style resources are transformed currently
    if (context.type !== 'style') {
      return null;
    }

    assert(
      !context.resourceFile || !hostOptions.externalStylesheets?.has(context.resourceFile),
      'External runtime stylesheets should not be transformed: ' + context.resourceFile,
    );

    // No transformation required if the resource is empty
    if (data.trim().length === 0) {
      return { content: '' };
    }

    const result = await hostOptions.transformStylesheet(
      data,
      context.containingFile,
      context.resourceFile ?? undefined,
      context.order,
      context.className,
    );

    return typeof result === 'string' ? { content: result } : null;
  };

  host.resourceNameToFileName = function (resourceName, containingFile) {
    const resolvedPath = nodePath.join(nodePath.dirname(containingFile), resourceName);
    if (!this.fileExists(resolvedPath)) {
      return null;
    }

    // Reject TypeScript files used as component resources (e.g., styleUrl pointing to a .ts file).
    // Processing a TypeScript file as a stylesheet or template causes confusing downstream errors.
    if (hasTypeScriptExtension(resolvedPath)) {
      return null;
    }

    // All resource names that have template file extensions are assumed to be templates
    // TODO: Update compiler to provide the resource type to avoid extension matching here.
    if (!hostOptions.externalStylesheets || hasTemplateExtension(resolvedPath)) {
      return resolvedPath;
    }

    // For external stylesheets, create a unique identifier and store the mapping
    let externalId = hostOptions.externalStylesheets.get(resolvedPath);
    if (externalId === undefined) {
      externalId = calculateHash(resolvedPath);
      hostOptions.externalStylesheets.set(resolvedPath, externalId);
    }

    return externalId + '.css';
  };

  // Allow the AOT compiler to request the set of changed templates and styles
  host.getModifiedResourceFiles = function () {
    return hostOptions.modifiedFiles;
  };

  // Provide a resolution cache to ensure package.json lookups are cached
  const resolutionCache = typescript.createModuleResolutionCache(
    host.getCurrentDirectory(),
    host.getCanonicalFileName.bind(host),
    compilerOptions,
    packageJsonCache,
  );
  host.getModuleResolutionCache = () => resolutionCache;
  host.resolveModuleNameLiterals = (
    moduleLiterals,
    containingFile,
    redirectedReference,
    options,
    containingSourceFile,
  ) => {
    return moduleLiterals.map((moduleLiteral) => {
      return typescript.resolveModuleName(
        moduleLiteral.text,
        containingFile,
        options,
        host,
        resolutionCache,
        redirectedReference,
        containingSourceFile.impliedNodeFormat,
      );
    });
  };

  // Augment TypeScript Host for file replacements option
  if (hostOptions.fileReplacements) {
    augmentHostWithReplacements(typescript, host, hostOptions.fileReplacements, resolutionCache);
  }

  // Augment TypeScript Host with source file caching if provided
  if (sourceFileCache) {
    augmentHostWithCaching(host, sourceFileCache);
  }

  return host;
}

const TEMPLATE_EXTENSIONS: ReadonlySet<string> = new Set(['.htm', '.html', '.svg']);
const TYPESCRIPT_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.tsx', '.mts', '.cts']);

function hasTemplateExtension(file: string): boolean {
  return TEMPLATE_EXTENSIONS.has(nodePath.extname(file).toLowerCase());
}

function hasTypeScriptExtension(file: string): boolean {
  return TYPESCRIPT_EXTENSIONS.has(nodePath.extname(file).toLowerCase());
}
