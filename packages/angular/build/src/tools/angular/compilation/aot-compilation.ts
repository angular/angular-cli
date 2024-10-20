/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type ng from '@angular/compiler-cli';
import assert from 'node:assert';
import { relative } from 'node:path';
import ts from 'typescript';
import { profileAsync, profileSync } from '../../esbuild/profiling';
import {
  AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from '../angular-host';
import { replaceBootstrap } from '../transformers/jit-bootstrap-transformer';
import { createWorkerTransformer } from '../transformers/web-worker-transformer';
import { AngularCompilation, DiagnosticModes, EmitFileResult } from './angular-compilation';

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
    externalStylesheets?: ReadonlyMap<string, string>;
    templateUpdates?: ReadonlyMap<string, string>;
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

    if (compilerOptions.externalRuntimeStyles) {
      hostOptions.externalStylesheets ??= new Map();
    }

    // Create Angular compiler host
    const host = createAngularCompilerHost(ts, compilerOptions, hostOptions);

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

    let templateUpdates;
    if (
      compilerOptions['_enableHmr'] &&
      hostOptions.modifiedFiles &&
      hasOnlyTemplates(hostOptions.modifiedFiles)
    ) {
      const componentNodes = [...hostOptions.modifiedFiles].flatMap((file) => [
        ...angularCompiler.getComponentsWithTemplateFile(file),
      ]);

      for (const node of componentNodes) {
        if (!ts.isClassDeclaration(node)) {
          continue;
        }
        const componentFilename = node.getSourceFile().fileName;
        let relativePath = relative(host.getCurrentDirectory(), componentFilename);
        if (relativePath.startsWith('..')) {
          relativePath = componentFilename;
        }
        const updateId = encodeURIComponent(
          `${host.getCanonicalFileName(relativePath)}@${node.name?.text}`,
        );
        const updateText = angularCompiler.emitHmrUpdateModule(node);
        if (updateText === null) {
          // Build is needed if a template cannot be updated
          templateUpdates = undefined;
          break;
        }
        templateUpdates ??= new Map<string, string>();
        templateUpdates.set(updateId, updateText);
      }
    }

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

    return {
      affectedFiles,
      compilerOptions,
      referencedFiles,
      externalStylesheets: hostOptions.externalStylesheets,
      templateUpdates,
    };
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
    const { affectedFiles, angularCompiler, compilerHost, typeScriptProgram, webWorkerTransform } =
      this.#state;
    const compilerOptions = typeScriptProgram.getCompilerOptions();
    const buildInfoFilename = compilerOptions.tsBuildInfoFile ?? '.tsbuildinfo';
    const useTypeScriptTranspilation =
      !compilerOptions.isolatedModules ||
      !!compilerOptions.sourceMap ||
      !!compilerOptions.inlineSourceMap;

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
    const transformers = angularCompiler.prepareEmit().transformers;
    transformers.before ??= [];
    transformers.before.push(
      replaceBootstrap(() => typeScriptProgram.getProgram().getTypeChecker()),
    );
    transformers.before.push(webWorkerTransform);

    // Emit is handled in write file callback when using TypeScript
    if (useTypeScriptTranspilation) {
      // TypeScript will loop until there are no more affected files in the program
      while (
        typeScriptProgram.emitNextAffectedFile(
          writeFileCallback,
          undefined,
          undefined,
          transformers,
        )
      ) {
        /* empty */
      }
    } else if (compilerOptions.tsBuildInfoFile) {
      // Manually get the builder state for the persistent cache
      // The TypeScript API currently embeds this behavior inside the program emit
      // via emitNextAffectedFile but that also applies all internal transforms.
      const programWithGetState = typeScriptProgram.getProgram() as ts.Program & {
        emitBuildInfo(writeFileCallback?: ts.WriteFileCallback): void;
      };

      assert(
        typeof programWithGetState.emitBuildInfo === 'function',
        'TypeScript program emitBuildInfo is missing.',
      );

      programWithGetState.emitBuildInfo();
    }

    // Angular may have files that must be emitted but TypeScript does not consider affected
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (emittedFiles.has(sourceFile) || angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }

      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (
        angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile) &&
        !affectedFiles.has(sourceFile)
      ) {
        continue;
      }

      if (useTypeScriptTranspilation) {
        typeScriptProgram.emit(sourceFile, writeFileCallback, undefined, undefined, transformers);
        continue;
      }

      // When not using TypeScript transpilation, directly apply only Angular specific transformations
      const transformResult = ts.transform(
        sourceFile,
        [
          ...(transformers.before ?? []),
          ...(transformers.after ?? []),
        ] as ts.TransformerFactory<ts.SourceFile>[],
        compilerOptions,
      );

      assert(
        transformResult.transformed.length === 1,
        'TypeScript transforms should not produce multiple outputs for ' + sourceFile.fileName,
      );

      let contents;
      if (sourceFile === transformResult.transformed[0]) {
        // Use original content if no changes were made
        contents = sourceFile.text;
      } else {
        // Otherwise, print the transformed source file
        const printer = ts.createPrinter(compilerOptions, transformResult);
        contents = printer.printFile(transformResult.transformed[0]);
      }

      angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
      emittedFiles.set(sourceFile, { filename: sourceFile.fileName, contents });
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

function hasOnlyTemplates(modifiedFiles: Set<string>): boolean {
  for (const file of modifiedFiles) {
    const lowerFile = file.toLowerCase();
    if (lowerFile.endsWith('.html') || lowerFile.endsWith('.svg')) {
      continue;
    }

    return false;
  }

  return true;
}
