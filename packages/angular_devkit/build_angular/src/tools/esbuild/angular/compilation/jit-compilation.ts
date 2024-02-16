/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type ng from '@angular/compiler-cli';
import assert from 'node:assert';
import ts from 'typescript';
import { profileSync } from '../../profiling';
import { AngularHostOptions, createAngularCompilerHost } from '../angular-host';
import { createJitResourceTransformer } from '../jit-resource-transformer';
import { createWorkerTransformer } from '../web-worker-transformer';
import { AngularCompilation, DiagnosticModes, EmitFileResult } from './angular-compilation';

class JitCompilationState {
  constructor(
    public readonly compilerHost: ng.CompilerHost,
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly constructorParametersDownlevelTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly replaceResourcesTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly webWorkerTransform: ts.TransformerFactory<ts.SourceFile>,
  ) {}
}

export class JitCompilation extends AngularCompilation {
  #state?: JitCompilationState;

  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
    compilerOptions: ng.CompilerOptions;
    referencedFiles: readonly string[];
  }> {
    // Dynamically load the Angular compiler CLI package
    const { constructorParametersDownlevelTransform } = await AngularCompilation.loadCompilerCli();

    // Load the compiler configuration and transform as needed
    const {
      options: originalCompilerOptions,
      rootNames,
      errors: configurationDiagnostics,
    } = await this.loadConfiguration(tsconfig);
    const compilerOptions =
      compilerOptionsTransformer?.(originalCompilerOptions) ?? originalCompilerOptions;

    // Create Angular compiler host
    const host = createAngularCompilerHost(compilerOptions, hostOptions);

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

    const affectedFiles = profileSync('TS_FIND_AFFECTED', () =>
      findAffectedFiles(typeScriptProgram),
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

    return { affectedFiles, compilerOptions, referencedFiles };
  }

  *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
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

  emitAffectedFiles(): Iterable<EmitFileResult> {
    assert(this.#state, 'Compilation must be initialized prior to emitting files.');
    const {
      compilerHost,
      typeScriptProgram,
      constructorParametersDownlevelTransform,
      replaceResourcesTransform,
      webWorkerTransform,
    } = this.#state;
    const buildInfoFilename =
      typeScriptProgram.getCompilerOptions().tsBuildInfoFile ?? '.tsbuildinfo';

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

    // TypeScript will loop until there are no more affected files in the program
    while (
      typeScriptProgram.emitNextAffectedFile(writeFileCallback, undefined, undefined, transformers)
    ) {
      /* empty */
    }

    return emittedFiles;
  }
}

function findAffectedFiles(
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram,
): Set<ts.SourceFile> {
  const affectedFiles = new Set<ts.SourceFile>();

  let result;
  while ((result = builder.getSemanticDiagnosticsOfNextAffectedFile())) {
    affectedFiles.add(result.affected as ts.SourceFile);
  }

  return affectedFiles;
}
