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
  #cachedConfiguration?: TransformedConfiguration;
  #cachedRootFiles?: readonly string[];
  #tsConfigFiles?: Set<string>;
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
    // When `rootFiles` are explicitly provided (e.g., library builder), avoid re-parsing `tsconfig.json`
    // and walking the project directory tree via `readConfiguration` on every watch rebuild (~200-350ms on large libraries).
    const currentRootFiles = compilerOptionOverrides?.rootFiles;
    if (
      currentRootFiles &&
      this.#cachedConfiguration &&
      this.#cachedRootFiles &&
      this.#cachedRootFiles.length === currentRootFiles.length &&
      this.#cachedRootFiles.every((file, index) => file === currentRootFiles[index])
    ) {
      return this.#cachedConfiguration;
    }

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
    this.#tsConfigFiles = new Set(tsConfigFiles);

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

    const { compilerOptions, warnings } = transformCompilerOptions(
      ts,
      originalCompilerOptions,
      compilerOptionOverrides,
      tsconfig,
      buildType,
    );

    const config: TransformedConfiguration = {
      compilerOptions,
      rootNames,
      errors,
      warnings,
      tsConfigFiles,
    };

    if (currentRootFiles?.length) {
      this.#cachedConfiguration = config;
      this.#cachedRootFiles = currentRootFiles;
    }

    return config;
  }

  protected readonly sourceFiles = new Map<string, ts.SourceFile>();

  protected invalidateFiles(files: Iterable<string>): void {
    const tsConfigFiles = this.#tsConfigFiles;

    for (const file of files) {
      const posixFile = toPosixPath(file);
      this.sourceFiles.delete(posixFile);

      if (!tsConfigFiles) {
        continue;
      }

      let tsConfigCachedPath: string | undefined;
      if (tsConfigFiles.has(posixFile)) {
        tsConfigCachedPath = posixFile;
      } else {
        // Check with lowercased key because TypeScript lowercases the keys
        // of the extended config cache on case-insensitive operating systems.
        const lowerCasedPosixFile = posixFile.toLowerCase();
        if (tsConfigFiles.has(lowerCasedPosixFile)) {
          tsConfigCachedPath = lowerCasedPosixFile;
        }
      }

      if (!tsConfigCachedPath) {
        continue;
      }

      // If a tsconfig changes, we need to re-read the configuration.
      this.#cachedConfiguration = undefined;
      this.#cachedRootFiles = undefined;
      this.#extendedConfigCache.delete(tsConfigCachedPath);
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
