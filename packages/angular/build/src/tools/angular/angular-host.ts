/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type ng from '@angular/compiler-cli';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import nodePath from 'node:path';
import type ts from 'typescript';

export type AngularCompilerOptions = ng.CompilerOptions;
export type AngularCompilerHost = ng.CompilerHost;

export interface AngularHostOptions {
  fileReplacements?: Record<string, string>;
  sourceFileCache?: Map<string, ts.SourceFile>;
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
 * Patches in-place the `getSourceFiles` function on an instance of a TypeScript
 * `Program` to ensure that all returned SourceFile instances have a `version`
 * field. The `version` field is required when used with a TypeScript BuilderProgram.
 * @param program The TypeScript Program instance to patch.
 */
export function ensureSourceFileVersions(program: ts.Program): void {
  const baseGetSourceFiles = program.getSourceFiles;
  // TODO: Update Angular compiler to add versions to all internal files and remove this
  program.getSourceFiles = function (...parameters) {
    const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(
      ...parameters,
    );

    for (const file of files) {
      if (file.version === undefined) {
        file.version = createHash('sha256').update(file.text).digest('hex');
      }
    }

    return files;
  };
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
    resolvedModule: ts.ResolvedModule | undefined,
    moduleName: string,
  ) => ts.ResolvedModule | undefined,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  if (host.resolveModuleNames) {
    const baseResolveModuleNames = host.resolveModuleNames;
    host.resolveModuleNames = function (moduleNames: string[], ...parameters) {
      return moduleNames.map((name) => {
        const result = baseResolveModuleNames.call(host, [name], ...parameters);

        return resolvedModuleModifier(result[0], name);
      });
    };
  } else {
    host.resolveModuleNames = function (
      moduleNames: string[],
      containingFile: string,
      _reusedNames: string[] | undefined,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
    ) {
      return moduleNames.map((name) => {
        const result = typescript.resolveModuleName(
          name,
          containingFile,
          options,
          host,
          moduleResolutionCache,
          redirectedReference,
        ).resolvedModule;

        return resolvedModuleModifier(result, name);
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

  const tryReplace = (resolvedModule: ts.ResolvedModule | undefined) => {
    const replacement = resolvedModule && normalizedReplacements[resolvedModule.resolvedFileName];
    if (replacement) {
      return {
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

    // All resource names that have HTML file extensions are assumed to be templates
    if (resourceName.endsWith('.html') || !hostOptions.externalStylesheets) {
      return resolvedPath;
    }

    // For external stylesheets, create a unique identifier and store the mapping
    let externalId = hostOptions.externalStylesheets.get(resolvedPath);
    if (externalId === undefined) {
      externalId = createHash('sha256').update(resolvedPath).digest('hex');
      hostOptions.externalStylesheets.set(resolvedPath, externalId);
    }

    return externalId + '.css';
  };

  // Allow the AOT compiler to request the set of changed templates and styles
  host.getModifiedResourceFiles = function () {
    return hostOptions.modifiedFiles;
  };

  // Augment TypeScript Host for file replacements option
  if (hostOptions.fileReplacements) {
    // Provide a resolution cache since overriding resolution prevents automatic creation
    const resolutionCache = typescript.createModuleResolutionCache(
      host.getCurrentDirectory(),
      host.getCanonicalFileName.bind(host),
      compilerOptions,
    );
    host.getModuleResolutionCache = () => resolutionCache;

    augmentHostWithReplacements(typescript, host, hostOptions.fileReplacements, resolutionCache);
  }

  // Augment TypeScript Host with source file caching if provided
  if (hostOptions.sourceFileCache) {
    augmentHostWithCaching(host, hostOptions.sourceFileCache);
  }

  return host;
}
