/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import assert from 'node:assert';
import ts from 'typescript';
import { profileSync } from '../../esbuild/profiling';
import { AngularHostOptions, createAngularCompilerHost } from '../angular-host';
import { createJitResourceTransformer } from '../transformers/jit-resource-transformer';
import { lazyRoutesTransformer } from '../transformers/lazy-routes-transformer';
import { createWorkerTransformer } from '../transformers/web-worker-transformer';
import {
  type AngularCompilationResult,
  DiagnosticModes,
  type EmitFileResult,
} from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { TypeScriptCompilation } from './typescript-compilation';

class JitCompilationState {
  constructor(
    public readonly compilerHost: ng.CompilerHost,
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly constructorParametersDownlevelTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly replaceResourcesTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly webWorkerTransform: ts.TransformerFactory<ts.SourceFile>,
  ) {}
}

export class JitCompilation extends TypeScriptCompilation {
  #state?: JitCompilationState;

  constructor(private readonly browserOnlyBuild: boolean) {
    super();
  }

  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides?: CompilerOptionOverrides,
  ): Promise<AngularCompilationResult> {
    // Dynamically load the Angular compiler CLI package
    const { constructorParametersDownlevelTransform } =
      await import('@angular/compiler-cli/private/tooling');

    // Load the compiler configuration and transform as needed
    const {
      compilerOptions,
      rootNames,
      errors: configurationDiagnostics,
      warnings,
    } = await this.loadConfiguration(tsconfig, compilerOptionOverrides);

    if (hostOptions.modifiedFiles) {
      this.invalidateFiles(hostOptions.modifiedFiles);
    }

    // Create Angular compiler host
    const host = createAngularCompilerHost(
      ts,
      compilerOptions,
      hostOptions,
      undefined,
      this.sourceFiles,
    );

    // Create the TypeScript Program
    const typeScriptProgram = profileSync('TS_CREATE_PROGRAM', () =>
      ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        rootNames,
        compilerOptions,
        host,
        this.#state?.typeScriptProgram ?? ts.readBuilderProgram(compilerOptions, host),
        configurationDiagnostics,
      ),
    );

    this.#state = new JitCompilationState(
      host,
      typeScriptProgram,
      constructorParametersDownlevelTransform(typeScriptProgram.getProgram()),
      createJitResourceTransformer(() => typeScriptProgram.getProgram().getTypeChecker()),
      createWorkerTransformer(hostOptions.processWebWorker.bind(hostOptions)),
    );

    const referencedFiles = typeScriptProgram
      .getSourceFiles()
      .map((sourceFile) => sourceFile.fileName);

    return { compilerOptions, referencedFiles, warnings };
  }

  protected override *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
    assert(this.#state, 'Compilation must be initialized prior to collecting diagnostics.');
    const { typeScriptProgram } = this.#state;

    // Collect program level diagnostics
    if (modes & DiagnosticModes.Option) {
      yield* typeScriptProgram.getConfigFileParsingDiagnostics();
      yield* typeScriptProgram.getOptionsDiagnostics();
    }
    if (modes & DiagnosticModes.Syntactic) {
      yield* typeScriptProgram.getGlobalDiagnostics();
      yield* profileSync('NG_DIAGNOSTICS_SYNTACTIC', () =>
        typeScriptProgram.getSyntacticDiagnostics(),
      );
    }
    if (modes & DiagnosticModes.Semantic) {
      yield* profileSync('NG_DIAGNOSTICS_SEMANTIC', () =>
        typeScriptProgram.getSemanticDiagnostics(),
      );
    }
  }

  override emitAffectedFiles(): Iterable<EmitFileResult> {
    assert(this.#state, 'Compilation must be initialized prior to emitting files.');
    const {
      compilerHost,
      typeScriptProgram,
      constructorParametersDownlevelTransform,
      replaceResourcesTransform,
      webWorkerTransform,
    } = this.#state;
    const compilerOptions = typeScriptProgram.getCompilerOptions();
    const buildInfoFilename = compilerOptions.tsBuildInfoFile ?? '.tsbuildinfo';

    const emittedFiles: EmitFileResult[] = [];
    const writeFileCallback: ts.WriteFileCallback = (filename, contents, _a, _b, sourceFiles) => {
      if (!sourceFiles?.length && filename.endsWith(buildInfoFilename)) {
        // Save builder info contents to specified location
        compilerHost.writeFile(filename, contents, false);

        return;
      }

      assert(sourceFiles?.length === 1, 'Invalid TypeScript program emit for ' + filename);

      emittedFiles.push({ filename: sourceFiles[0].fileName, contents });
    };
    const transformers = {
      before: [
        replaceResourcesTransform,
        constructorParametersDownlevelTransform,
        webWorkerTransform,
      ],
    };

    if (!this.browserOnlyBuild) {
      transformers.before.push(lazyRoutesTransformer(compilerOptions, compilerHost));
    }

    // TypeScript will loop until there are no more affected files in the program
    while (
      typeScriptProgram.emitNextAffectedFile(writeFileCallback, undefined, undefined, transformers)
    ) {
      /* empty */
    }

    return emittedFiles;
  }
}
