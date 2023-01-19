/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'node:assert';
import ts from 'typescript';
import { AngularCompilation } from '../angular-compilation';
import { AngularHostOptions, createAngularCompilerHost } from '../angular-host';
import { profileSync } from '../profiling';
import { createJitResourceTransformer } from './jit-resource-transformer';

class JitCompilationState {
  constructor(
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly constructorParametersDownlevelTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly replaceResourcesTransform: ts.TransformerFactory<ts.SourceFile>,
  ) {}
}

export interface EmitFileResult {
  content?: string;
  map?: string;
  dependencies: readonly string[];
}
export type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;

export class JitCompilation {
  #state?: JitCompilationState;

  async initialize(
    rootNames: string[],
    compilerOptions: ts.CompilerOptions,
    hostOptions: AngularHostOptions,
    configurationDiagnostics?: ts.Diagnostic[],
  ): Promise<{ affectedFiles: ReadonlySet<ts.SourceFile> }> {
    // Dynamically load the Angular compiler CLI package
    const { constructorParametersDownlevelTransform } = await AngularCompilation.loadCompilerCli();

    // Create Angular compiler host
    const host = createAngularCompilerHost(compilerOptions, hostOptions);

    // Create the TypeScript Program
    const typeScriptProgram = profileSync('TS_CREATE_PROGRAM', () =>
      ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        rootNames,
        compilerOptions,
        host,
        this.#state?.typeScriptProgram,
        configurationDiagnostics,
      ),
    );

    const affectedFiles = profileSync('TS_FIND_AFFECTED', () =>
      findAffectedFiles(typeScriptProgram),
    );

    this.#state = new JitCompilationState(
      typeScriptProgram,
      constructorParametersDownlevelTransform(typeScriptProgram.getProgram()),
      createJitResourceTransformer(() => typeScriptProgram.getProgram().getTypeChecker()),
    );

    return { affectedFiles };
  }

  *collectDiagnostics(): Iterable<ts.Diagnostic> {
    assert(this.#state, 'Compilation must be initialized prior to collecting diagnostics.');
    const { typeScriptProgram } = this.#state;

    // Collect program level diagnostics
    yield* typeScriptProgram.getConfigFileParsingDiagnostics();
    yield* typeScriptProgram.getOptionsDiagnostics();
    yield* typeScriptProgram.getGlobalDiagnostics();
    yield* profileSync('NG_DIAGNOSTICS_SYNTACTIC', () =>
      typeScriptProgram.getSyntacticDiagnostics(),
    );
    yield* profileSync('NG_DIAGNOSTICS_SEMANTIC', () => typeScriptProgram.getSemanticDiagnostics());
  }

  createFileEmitter(onAfterEmit?: (sourceFile: ts.SourceFile) => void): FileEmitter {
    assert(this.#state, 'Compilation must be initialized prior to emitting files.');
    const {
      typeScriptProgram,
      constructorParametersDownlevelTransform,
      replaceResourcesTransform,
    } = this.#state;

    const transformers = {
      before: [replaceResourcesTransform, constructorParametersDownlevelTransform],
    };

    return async (file: string) => {
      const sourceFile = typeScriptProgram.getSourceFile(file);
      if (!sourceFile) {
        return undefined;
      }

      let content: string | undefined;
      typeScriptProgram.emit(
        sourceFile,
        (filename, data) => {
          if (/\.[cm]?js$/.test(filename)) {
            content = data;
          }
        },
        undefined /* cancellationToken */,
        undefined /* emitOnlyDtsFiles */,
        transformers,
      );

      onAfterEmit?.(sourceFile);

      return { content, dependencies: [] };
    };
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
