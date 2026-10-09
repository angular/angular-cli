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
          declaration: false,
          declarationMap: false,
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
    if (compilerOptionOverrides?.rootFiles?.length) {
      const rootFilesSet = new Set(
        compilerOptionOverrides.rootFiles.map((file) => canonicalizePath(toPosixPath(file))),
      );

      for (const file of originalRootNames) {
        if (/\.d\.[cm]?ts$/i.test(file)) {
          rootFilesSet.add(canonicalizePath(toPosixPath(file)));
        }
      }

      rootNames = [...rootFilesSet];
    }

    if (compilerOptionOverrides?.excludeRootFiles?.length) {
      const excludeSet = new Set(
        compilerOptionOverrides.excludeRootFiles.map((file) => canonicalizePath(toPosixPath(file))),
      );

      rootNames = rootNames.filter((file) => !excludeSet.has(canonicalizePath(toPosixPath(file))));
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
