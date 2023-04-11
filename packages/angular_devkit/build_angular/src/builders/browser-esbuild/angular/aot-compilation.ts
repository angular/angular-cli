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
import { profileAsync, profileSync } from '../profiling';
import { AngularCompilation, FileEmitter } from './angular-compilation';
import {
  AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from './angular-host';

// Temporary deep import for transformer support
// TODO: Move these to a private exports location or move the implementation into this package.
const { mergeTransformers, replaceBootstrap } = require('@ngtools/webpack/src/ivy/transformation');

class AngularCompilationState {
  constructor(
    public readonly angularProgram: ng.NgtscProgram,
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly affectedFiles: ReadonlySet<ts.SourceFile>,
    public readonly templateDiagnosticsOptimization: ng.OptimizeFor,
    public readonly diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>(),
  ) {}

  get angularCompiler() {
    return this.angularProgram.compiler;
  }
}

export class AotCompilation extends AngularCompilation {
  #state?: AngularCompilationState;

  async initialize(
    rootNames: string[],
    compilerOptions: ng.CompilerOptions,
    hostOptions: AngularHostOptions,
    configurationDiagnostics?: ts.Diagnostic[],
  ): Promise<{ affectedFiles: ReadonlySet<ts.SourceFile> }> {
    // Dynamically load the Angular compiler CLI package
    const { NgtscProgram, OptimizeFor } = await AngularCompilation.loadCompilerCli();

    // Create Angular compiler host
    const host = createAngularCompilerHost(compilerOptions, hostOptions);

    // Create the Angular specific program that contains the Angular compiler
    const angularProgram = profileSync(
      'NG_CREATE_PROGRAM',
      () => new NgtscProgram(rootNames, compilerOptions, host, this.#state?.angularProgram),
    );
    const angularCompiler = angularProgram.compiler;
    const angularTypeScriptProgram = angularProgram.getTsProgram();
    ensureSourceFileVersions(angularTypeScriptProgram);

    const typeScriptProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      angularTypeScriptProgram,
      host,
      this.#state?.typeScriptProgram,
      configurationDiagnostics,
    );

    await profileAsync('NG_ANALYZE_PROGRAM', () => angularCompiler.analyzeAsync());
    const affectedFiles = profileSync('NG_FIND_AFFECTED', () =>
      findAffectedFiles(typeScriptProgram, angularCompiler),
    );

    this.#state = new AngularCompilationState(
      angularProgram,
      typeScriptProgram,
      affectedFiles,
      affectedFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram,
      this.#state?.diagnosticCache,
    );

    return { affectedFiles };
  }

  *collectDiagnostics(): Iterable<ts.Diagnostic> {
    assert(this.#state, 'Angular compilation must be initialized prior to collecting diagnostics.');
    const {
      affectedFiles,
      angularCompiler,
      diagnosticCache,
      templateDiagnosticsOptimization,
      typeScriptProgram,
    } = this.#state;

    // Collect program level diagnostics
    yield* typeScriptProgram.getConfigFileParsingDiagnostics();
    yield* angularCompiler.getOptionDiagnostics();
    yield* typeScriptProgram.getOptionsDiagnostics();
    yield* typeScriptProgram.getGlobalDiagnostics();

    // Collect source file specific diagnostics
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      // TypeScript will use cached diagnostics for files that have not been
      // changed or affected for this build when using incremental building.
      yield* profileSync(
        'NG_DIAGNOSTICS_SYNTACTIC',
        () => typeScriptProgram.getSyntacticDiagnostics(sourceFile),
        true,
      );
      yield* profileSync(
        'NG_DIAGNOSTICS_SEMANTIC',
        () => typeScriptProgram.getSemanticDiagnostics(sourceFile),
        true,
      );

      // Declaration files cannot have template diagnostics
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      // Only request Angular template diagnostics for affected files to avoid
      // overhead of template diagnostics for unchanged files.
      if (affectedFiles.has(sourceFile)) {
        const angularDiagnostics = profileSync(
          'NG_DIAGNOSTICS_TEMPLATE',
          () => angularCompiler.getDiagnosticsForFile(sourceFile, templateDiagnosticsOptimization),
          true,
        );
        diagnosticCache.set(sourceFile, angularDiagnostics);
        yield* angularDiagnostics;
      } else {
        const angularDiagnostics = diagnosticCache.get(sourceFile);
        if (angularDiagnostics) {
          yield* angularDiagnostics;
        }
      }
    }
  }

  createFileEmitter(onAfterEmit?: (sourceFile: ts.SourceFile) => void): FileEmitter {
    assert(this.#state, 'Angular compilation must be initialized prior to emitting files.');
    const { angularCompiler, typeScriptProgram } = this.#state;

    const transformers = mergeTransformers(angularCompiler.prepareEmit().transformers, {
      before: [replaceBootstrap(() => typeScriptProgram.getProgram().getTypeChecker())],
    });

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

      angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
      onAfterEmit?.(sourceFile);

      return { content, dependencies: [] };
    };
  }
}

function findAffectedFiles(
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  { ignoreForDiagnostics, ignoreForEmit, incrementalCompilation }: ng.NgtscProgram['compiler'],
): Set<ts.SourceFile> {
  const affectedFiles = new Set<ts.SourceFile>();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
      // If the affected file is a TTC shim, add the shim's original source file.
      // This ensures that changes that affect TTC are typechecked even when the changes
      // are otherwise unrelated from a TS perspective and do not result in Ivy codegen changes.
      // For example, changing @Input property types of a directive used in another component's
      // template.
      // A TTC shim is a file that has been ignored for diagnostics and has a filename ending in `.ngtypecheck.ts`.
      if (ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
        // This file name conversion relies on internal compiler logic and should be converted
        // to an official method when available. 15 is length of `.ngtypecheck.ts`
        const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
        const originalSourceFile = builder.getSourceFile(originalFilename);
        if (originalSourceFile) {
          affectedFiles.add(originalSourceFile);
        }

        return true;
      }

      return false;
    });

    if (!result) {
      break;
    }

    affectedFiles.add(result.affected as ts.SourceFile);
  }

  // A file is also affected if the Angular compiler requires it to be emitted
  for (const sourceFile of builder.getSourceFiles()) {
    if (ignoreForEmit.has(sourceFile) || incrementalCompilation.safeToSkipEmit(sourceFile)) {
      continue;
    }

    affectedFiles.add(sourceFile);
  }

  return affectedFiles;
}
