/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type ng from '@angular/compiler-cli';
import ts from 'typescript';

export type AngularCompilerOptions = ng.CompilerOptions;
export type AngularCompilerHost = ng.CompilerHost;

export interface AngularHostOptions {
  fileReplacements?: Record<string, string>;
  sourceFileCache?: Map<string, ts.SourceFile>;
  modifiedFiles?: Set<string>;
  transformStylesheet(
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ): Promise<string | null>;
  processWebWorker(workerFile: string, containingFile: string): string;
}

// Temporary deep import for host augmentation support.
// TODO: Move these to a private exports location or move the implementation into this package.
const {
  augmentHostWithCaching,
  augmentHostWithReplacements,
  augmentProgramWithVersioning,
} = require('@ngtools/webpack/src/ivy/host');

/**
 * Patches in-place the `getSourceFiles` function on an instance of a TypeScript
 * `Program` to ensure that all returned SourceFile instances have a `version`
 * field. The `version` field is required when used with a TypeScript BuilderProgram.
 * @param program The TypeScript Program instance to patch.
 */
export function ensureSourceFileVersions(program: ts.Program): void {
  augmentProgramWithVersioning(program);
}

export function createAngularCompilerHost(
  compilerOptions: AngularCompilerOptions,
  hostOptions: AngularHostOptions,
): AngularCompilerHost {
  // Create TypeScript compiler host
  const host: AngularCompilerHost = ts.createIncrementalCompilerHost(compilerOptions);
  // Set the parsing mode to the same as TS 5.3 default for tsc. This provides a parse
  // performance improvement by skipping non-type related JSDoc parsing.
  // NOTE: The check for this enum can be removed when TS 5.3 support is the minimum.
  if (ts.JSDocParsingMode) {
    host.jsDocParsingMode = ts.JSDocParsingMode.ParseForTypeErrors;
  }

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

    const result = await hostOptions.transformStylesheet(
      data,
      context.containingFile,
      context.resourceFile ?? undefined,
    );

    return typeof result === 'string' ? { content: result } : null;
  };

  // Allow the AOT compiler to request the set of changed templates and styles
  host.getModifiedResourceFiles = function () {
    return hostOptions.modifiedFiles;
  };

  // Augment TypeScript Host for file replacements option
  if (hostOptions.fileReplacements) {
    // Provide a resolution cache since overriding resolution prevents automatic creation
    const resolutionCache = ts.createModuleResolutionCache(
      host.getCurrentDirectory(),
      host.getCanonicalFileName.bind(host),
      compilerOptions,
    );
    host.getModuleResolutionCache = () => resolutionCache;

    augmentHostWithReplacements(host, hostOptions.fileReplacements, resolutionCache);
  }

  // Augment TypeScript Host with source file caching if provided
  if (hostOptions.sourceFileCache) {
    augmentHostWithCaching(host, hostOptions.sourceFileCache);
  }

  return host;
}
