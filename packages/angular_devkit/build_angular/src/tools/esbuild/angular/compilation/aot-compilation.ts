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
import { profileAsync, profileSync } from '../../profiling';
import {
  AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from '../angular-host';
import { createWorkerTransformer } from '../web-worker-transformer';
import { AngularCompilation, DiagnosticModes, EmitFileResult } from './angular-compilation';

// Temporary deep import for transformer support
// TODO: Move these to a private exports location or move the implementation into this package.
const { mergeTransformers, replaceBootstrap } = require('@ngtools/webpack/src/ivy/transformation');

class AngularCompilationState {
  constructor(
    public readonly angularProgram: ng.NgtscProgram,
    public readonly compilerHost: ng.CompilerHost,
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly affectedFiles: ReadonlySet<ts.SourceFile>,
    public readonly templateDiagnosticsOptimization: ng.OptimizeFor,
    public readonly webWorkerTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>(),
  ) {}

  get angularCompiler() {
    return this.angularProgram.compiler;
  }
}

export class AotCompilation extends AngularCompilation {
  #state?: AngularCompilationState;

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
    const { NgtscProgram, OptimizeFor } = await AngularCompilation.loadCompilerCli();

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

    // Create the Angular specific program that contains the Angular compiler
    const angularProgram = profileSync(
      'NG_CREATE_PROGRAM',
      () => new NgtscProgram(rootNames, compilerOptions, host, this.#state?.angularProgram),
    );
    const angularCompiler = angularProgram.compiler;
    const angularTypeScriptProgram = angularProgram.getTsProgram();
    ensureSourceFileVersions(angularTypeScriptProgram);

    let oldProgram = this.#state?.typeScriptProgram;
    let usingBuildInfo = false;
    if (!oldProgram) {
      oldProgram = ts.readBuilderProgram(compilerOptions, host);
      usingBuildInfo = !!oldProgram;
    }

    const typeScriptProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      angularTypeScriptProgram,
      host,
      oldProgram,
      configurationDiagnostics,
    );

    await profileAsync('NG_ANALYZE_PROGRAM', () => angularCompiler.analyzeAsync());
    const affectedFiles = profileSync('NG_FIND_AFFECTED', () =>
      findAffectedFiles(typeScriptProgram, angularCompiler, usingBuildInfo),
    );

    // Get all files referenced in the TypeScript/Angular program including component resources
    const referencedFiles = typeScriptProgram
      .getSourceFiles()
      .filter((sourceFile) => !angularCompiler.ignoreForEmit.has(sourceFile))
      .flatMap((sourceFile) => {
        const resourceDependencies = angularCompiler.getResourceDependencies(sourceFile);

        // Also invalidate Angular diagnostics for a source file if component resources are modified
        if (this.#state && hostOptions.modifiedFiles?.size) {
          for (const resourceDependency of resourceDependencies) {
            if (hostOptions.modifiedFiles.has(resourceDependency)) {
              this.#state.diagnosticCache.delete(sourceFile);
              // Also mark as affected in case changed template affects diagnostics
              affectedFiles.add(sourceFile);
            }
          }
        }

        return [sourceFile.fileName, ...resourceDependencies];
      });

    this.#state = new AngularCompilationState(
      angularProgram,
      host,
      typeScriptProgram,
      affectedFiles,
      affectedFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram,
      createWorkerTransformer(hostOptions.processWebWorker.bind(hostOptions)),
      this.#state?.diagnosticCache,
    );

    return { affectedFiles, compilerOptions, referencedFiles };
  }

  *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
    assert(this.#state, 'Angular compilation must be initialized prior to collecting diagnostics.');
    const {
      affectedFiles,
      angularCompiler,
      diagnosticCache,
      templateDiagnosticsOptimization,
      typeScriptProgram,
    } = this.#state;

    const syntactic = modes & DiagnosticModes.Syntactic;
    const semantic = modes & DiagnosticModes.Semantic;

    // Collect program level diagnostics
    if (modes & DiagnosticModes.Option) {
      yield* typeScriptProgram.getConfigFileParsingDiagnostics();
      yield* angularCompiler.getOptionDiagnostics();
      yield* typeScriptProgram.getOptionsDiagnostics();
    }
    if (syntactic) {
      yield* typeScriptProgram.getGlobalDiagnostics();
    }

    // Collect source file specific diagnostics
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      if (syntactic) {
        // TypeScript will use cached diagnostics for files that have not been
        // changed or affected for this build when using incremental building.
        yield* profileSync(
          'NG_DIAGNOSTICS_SYNTACTIC',
          () => typeScriptProgram.getSyntacticDiagnostics(sourceFile),
          true,
        );
      }

      if (!semantic) {
        continue;
      }

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

  emitAffectedFiles(): Iterable<EmitFileResult> {
    assert(this.#state, 'Angular compilation must be initialized prior to emitting files.');
    const { angularCompiler, compilerHost, typeScriptProgram, webWorkerTransform } = this.#state;
    const buildInfoFilename =
      typeScriptProgram.getCompilerOptions().tsBuildInfoFile ?? '.tsbuildinfo';

    const emittedFiles = new Map<ts.SourceFile, EmitFileResult>();
    const writeFileCallback: ts.WriteFileCallback = (filename, contents, _a, _b, sourceFiles) => {
      if (!sourceFiles?.length && filename.endsWith(buildInfoFilename)) {
        // Save builder info contents to specified location
        compilerHost.writeFile(filename, contents, false);

        return;
      }

      assert(sourceFiles?.length === 1, 'Invalid TypeScript program emit for ' + filename);
      const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        return;
      }

      angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
      emittedFiles.set(sourceFile, { filename: sourceFile.fileName, contents });
    };
    const transformers = mergeTransformers(angularCompiler.prepareEmit().transformers, {
      before: [
        replaceBootstrap(() => typeScriptProgram.getProgram().getTypeChecker()),
        webWorkerTransform,
      ],
    });

    // TypeScript will loop until there are no more affected files in the program
    while (
      typeScriptProgram.emitNextAffectedFile(writeFileCallback, undefined, undefined, transformers)
    ) {
      /* empty */
    }

    // Angular may have files that must be emitted but TypeScript does not consider affected
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (emittedFiles.has(sourceFile) || angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }

      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile)) {
        continue;
      }

      typeScriptProgram.emit(sourceFile, writeFileCallback, undefined, undefined, transformers);
    }

    return emittedFiles.values();
  }
}

function findAffectedFiles(
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  { ignoreForDiagnostics }: ng.NgtscProgram['compiler'],
  includeTTC: boolean,
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

  // Add all files with associated template type checking files.
  // Stored TS build info does not have knowledge of the AOT compiler or the typechecking state of the templates.
  // To ensure that errors are reported correctly, all AOT component diagnostics need to be analyzed even if build
  // info is present.
  if (includeTTC) {
    for (const sourceFile of builder.getSourceFiles()) {
      if (ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
        // This file name conversion relies on internal compiler logic and should be converted
        // to an official method when available. 15 is length of `.ngtypecheck.ts`
        const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
        const originalSourceFile = builder.getSourceFile(originalFilename);
        if (originalSourceFile) {
          affectedFiles.add(originalSourceFile);
        }
      }
    }
  }

  return affectedFiles;
}
