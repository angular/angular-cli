/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import ts from 'typescript';
import { canonicalizePath, toPosixPath } from '../../../utils/path';
import { profileAsync, profileSync } from '../../../utils/profiling';
import { AngularCompilation, DiagnosticModes } from './angular-compilation';
import { type CompilerOptionOverrides, transformCompilerOptions } from './compiler-options';
import { convertTypeScriptDiagnostic } from './diagnostics';

export interface TransformedConfiguration {
  compilerOptions: ng.CompilerOptions;
  rootNames: string[];
  fallbackRootNames?: string[];
  errors: ts.Diagnostic[];
  warnings: PartialMessage[];
  tsConfigFiles: readonly string[];
}

export abstract class TypeScriptCompilation extends AngularCompilation {
  static #angularCompilerCliModule?: typeof ng;
  readonly #extendedConfigCache = new Map<string, ts.ExtendedConfigCacheEntry>();

  static async loadCompilerCli(): Promise<typeof ng> {
    TypeScriptCompilation.#angularCompilerCliModule ??= await import('@angular/compiler-cli');

    return TypeScriptCompilation.#angularCompilerCliModule;
  }

  protected async loadConfiguration(
    tsconfig: string,
    compilerOptionOverrides?: CompilerOptionOverrides,
    buildType: 'application' | 'library' = 'application',
  ): Promise<TransformedConfiguration> {
    const { readConfiguration } = await TypeScriptCompilation.loadCompilerCli();

    const {
      options: originalCompilerOptions,
      rootNames: originalRootNames,
      errors,
    } = profileSync('NG_READ_CONFIG', () =>
      readConfiguration(
        tsconfig,
        {
          // Angular specific configuration defaults and overrides to ensure a functioning compilation.
          suppressOutputPathCheck: true,
          outDir: undefined,
          sourceMap: false,
          ...(buildType === 'library'
            ? { declaration: true }
            : {
                declaration: false,
                declarationMap: false,
              }),
          allowEmptyCodegenFiles: false,
          annotationsAs: 'decorators',
          enableResourceInlining: false,
          supportTestBed: false,
          supportJitMode: false,
          // Disable removing of comments as TS is quite aggressive with these and can
          // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
          removeComments: false,
        },
        undefined,
        this.#extendedConfigCache,
      ),
    );

    const tsConfigFiles = [toPosixPath(tsconfig), ...this.#extendedConfigCache.keys()];

    let rootNames = originalRootNames;
    let fallbackRootNames: string[] | undefined;
    if (compilerOptionOverrides?.rootFiles?.length) {
      // When explicit rootFiles are provided (e.g., filtered unit test entry points), restrict
      // the initial program to only those entry points so TypeScript resolves only their
      // transitive imports and skips unrelated or non-included test/application files.
      const rootFilesSet = new Set(
        compilerOptionOverrides.rootFiles.map((file) => canonicalizePath(toPosixPath(file))),
      );
      const fallbackFilesSet = new Set(rootFilesSet);
      for (const file of originalRootNames) {
        const canonicalFile = canonicalizePath(toPosixPath(file));
        // Ambient declaration files (.d.ts) are not imported directly, so they must always be
        // retained from the tsconfig to preserve global type definitions.
        if (/\.d\.[cm]?ts$/i.test(file)) {
          rootFilesSet.add(canonicalFile);
        }
        fallbackFilesSet.add(canonicalFile);
      }
      rootNames = [...rootFilesSet];
      // For application builds (including unit tests), preserve the full set of tsconfig root
      // files as a fallback in case the AOT compilation encounters a non-standalone component
      // whose declaring NgModule is not directly imported by the entry points. Note that when a
      // test tsconfig uses broad globs (e.g., `src/**/*.ts`), this fallback set will also include
      // non-included spec files; this is an acceptable trade-off to keep compilation agnostic of
      // test-file naming conventions and only occurs for legacy non-standalone components lacking
      // explicit NgModule imports. Library builds are excluded because all public NgModules must
      // be reachable from the library entry points and should never resolve compilation scope from
      // unexported tsconfig files.
      if (buildType === 'application' && fallbackFilesSet.size > rootFilesSet.size) {
        fallbackRootNames = [...fallbackFilesSet];
      }
    }

    const { compilerOptions, warnings } = transformCompilerOptions(
      ts,
      originalCompilerOptions,
      compilerOptionOverrides,
      tsconfig,
      buildType,
    );

    return {
      compilerOptions,
      rootNames,
      fallbackRootNames,
      errors,
      warnings,
      tsConfigFiles,
    };
  }

  protected readonly sourceFiles = new Map<string, ts.SourceFile>();

  protected invalidateFiles(files: Iterable<string>): void {
    for (const file of files) {
      const posixFile = toPosixPath(file);
      this.sourceFiles.delete(posixFile);

      if (this.#extendedConfigCache.size === 0) {
        continue;
      }

      if (this.#extendedConfigCache.delete(posixFile)) {
        continue;
      }

      // Check with lowercased key because TypeScript lowercases the keys
      // of the extended config cache on case-insensitive operating systems.
      this.#extendedConfigCache.delete(posixFile.toLowerCase());
    }
  }

  override async update(files: Set<string>): Promise<void> {
    this.invalidateFiles(files);
  }

  protected abstract collectDiagnostics(
    modes: DiagnosticModes,
  ): Iterable<ts.Diagnostic> | Promise<Iterable<ts.Diagnostic>>;

  override async diagnoseFiles(
    modes = DiagnosticModes.All,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    if (modes === DiagnosticModes.None) {
      return {};
    }

    const result: { errors?: PartialMessage[]; warnings?: PartialMessage[] } = {};

    await profileAsync('NG_DIAGNOSTICS_TOTAL', async () => {
      const diagnostics = await this.collectDiagnostics(modes);

      for (const diagnostic of diagnostics) {
        const message = convertTypeScriptDiagnostic(ts, diagnostic);
        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          (result.errors ??= []).push(message);
        } else {
          (result.warnings ??= []).push(message);
        }
      }
    });

    return result;
  }
}
