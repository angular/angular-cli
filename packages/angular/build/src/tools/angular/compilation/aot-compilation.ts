/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import assert from 'node:assert';
import { relative } from 'node:path';
import ts from 'typescript';
import { useTypeChecking } from '../../../utils/environment-options';
import { profileAsync, profileSync } from '../../../utils/profiling';
import {
  AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from '../angular-host';
import { replaceBootstrap } from '../transformers/jit-bootstrap-transformer';
import { lazyRoutesTransformer } from '../transformers/lazy-routes-transformer';
import { createWorkerTransformer } from '../transformers/web-worker-transformer';
import {
  type AngularCompilationResult,
  DiagnosticModes,
  type EmitFileResult,
} from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { collectHmrCandidates } from './hmr-candidates';
import { TypeScriptCompilation } from './typescript-compilation';
import { printSourceFileWithMap } from './typescript-printer';

/**
 * The modified files count limit for performing component HMR analysis.
 * Performing content analysis for a large amount of files can result in longer rebuild times
 * than a full rebuild would entail.
 */
const HMR_MODIFIED_FILE_LIMIT = 32;

/**
 * Extension for Angular type-checking files.
 */
const TTC_EXTENSION = '.ngtypecheck.ts';

/**
 * Length of the `.ngtypecheck.ts` extension.
 */
const TTC_EXTENSION_LENGTH = TTC_EXTENSION.length;

/**
 * Checks if a file is an Angular type-checking shim file.
 */
function isNgTypeCheckFile(fileName: string): boolean {
  return fileName.endsWith(TTC_EXTENSION);
}

/**
 * Returns the original filename for a type-checking shim file.
 */
function getOriginalFilename(fileName: string): string {
  return fileName.slice(0, -TTC_EXTENSION_LENGTH) + '.ts';
}

class AngularCompilationState {
  constructor(
    public readonly angularProgram: ng.NgtscProgram,
    public readonly compilerHost: ng.CompilerHost,
    public typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly affectedFiles: ReadonlySet<ts.SourceFile>,
    public readonly templateDiagnosticsOptimization: ng.OptimizeFor,
    public readonly webWorkerTransform: ts.TransformerFactory<ts.SourceFile>,
    public readonly useTypeScriptTranspilation: boolean,
    public readonly diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>(),
    public readonly filesWithoutDtsSignature = new Set<string>(),
    public readonly useFallbackRootNames = false,
  ) {}

  get angularCompiler() {
    return this.angularProgram.compiler;
  }
}

export class AotCompilation extends TypeScriptCompilation {
  #state?: AngularCompilationState;

  constructor(private readonly browserOnlyBuild: boolean) {
    super();
  }

  // eslint-disable-next-line max-lines-per-function
  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides?: CompilerOptionOverrides,
    buildType: 'application' | 'library' = 'application',
  ): Promise<AngularCompilationResult> {
    // Dynamically load the Angular compiler CLI package
    const { NgtscProgram, OptimizeFor } = await TypeScriptCompilation.loadCompilerCli();

    // Load the compiler configuration and transform as needed
    const {
      compilerOptions,
      rootNames,
      fallbackRootNames,
      errors: configurationDiagnostics,
      warnings,
      tsConfigFiles,
    } = await this.loadConfiguration(tsconfig, compilerOptionOverrides, buildType);

    const useTypeScriptTranspilation =
      (compilerOptions['_useTypeScriptTranspilation'] as boolean | undefined) ??
      !compilerOptions.isolatedModules;

    if (compilerOptions.externalRuntimeStyles) {
      hostOptions.externalStylesheets ??= new Map();
    }

    // Reuse the package.json cache from the previous compilation
    const packageJsonCache = this.#state?.compilerHost
      .getModuleResolutionCache?.()
      ?.getPackageJsonInfoCache();

    const useHmr =
      compilerOptions['_enableHmr'] &&
      hostOptions.modifiedFiles &&
      hostOptions.modifiedFiles.size <= HMR_MODIFIED_FILE_LIMIT;

    let staleSourceFiles;
    let clearPackageJsonCache = false;
    if (hostOptions.modifiedFiles) {
      this.invalidateFiles(hostOptions.modifiedFiles);

      if (this.#state && hostOptions.modifiedFiles.size > 0) {
        for (const modifiedFile of hostOptions.modifiedFiles) {
          // Clear package.json cache if a node modules file was modified
          if (!clearPackageJsonCache && modifiedFile.includes('node_modules')) {
            clearPackageJsonCache = true;
            packageJsonCache?.clear();
          }

          // Collect stale source files for HMR analysis of inline component resources
          if (useHmr) {
            const sourceFile = this.#state.typeScriptProgram.getSourceFile(modifiedFile);
            if (sourceFile) {
              staleSourceFiles ??= new Map<string, ts.SourceFile>();
              staleSourceFiles.set(modifiedFile, sourceFile);
            }
          }
        }

        if (useTypeChecking || useTypeScriptTranspilation) {
          populatePreviousDtsSignatures(
            this.#state.typeScriptProgram,
            hostOptions.modifiedFiles,
            this.#state.filesWithoutDtsSignature,
          );
        }
      }
    }

    // Create Angular compiler host
    const host = createAngularCompilerHost(
      ts,
      compilerOptions,
      hostOptions,
      packageJsonCache,
      this.sourceFiles,
    );

    // If a previous watch rebuild already fell back to the full tsconfig root file set,
    // start directly with fallbackRootNames to avoid repeating the two-step check.
    let useFallbackRootNames = this.#state?.useFallbackRootNames ?? false;

    // Create the Angular specific program that contains the Angular compiler
    let angularProgram = profileSync(
      'NG_CREATE_PROGRAM',
      () =>
        new NgtscProgram(
          (useFallbackRootNames && fallbackRootNames) || rootNames,
          compilerOptions,
          host,
          this.#state?.angularProgram,
        ),
    );
    let angularCompiler = angularProgram.compiler;

    await profileAsync('NG_ANALYZE_PROGRAM', () => angularCompiler.analyzeAsync());

    let angularTypeScriptProgram = angularProgram.getTsProgram();

    // When rootFiles filtering is active and a non-standalone component without a resolved
    // NgModule scope is encountered, its declaring NgModule may not be directly imported by
    // the test entry points. Fall back to the full tsconfig root file set if it contains
    // additional uncompiled files so the Angular compiler can discover all NgModules and
    // resolve component compilation scopes.
    if (
      !useFallbackRootNames &&
      fallbackRootNames?.some((file) => !angularTypeScriptProgram.getSourceFile(file)) &&
      hasUnscopedComponent(angularCompiler)
    ) {
      useFallbackRootNames = true;
      angularProgram = profileSync(
        'NG_CREATE_PROGRAM_FALLBACK',
        () => new NgtscProgram(fallbackRootNames, compilerOptions, host, angularProgram),
      );
      angularCompiler = angularProgram.compiler;

      await profileAsync('NG_ANALYZE_PROGRAM_FALLBACK', () => angularCompiler.analyzeAsync());
      angularTypeScriptProgram = angularProgram.getTsProgram();
    }

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

    const filesWithoutDtsSignature = this.#state?.filesWithoutDtsSignature ?? new Set<string>();
    if (!this.#state) {
      for (const sourceFile of typeScriptProgram.getSourceFiles()) {
        if (
          !sourceFile.isDeclarationFile &&
          !angularCompiler.ignoreForDiagnostics.has(sourceFile)
        ) {
          filesWithoutDtsSignature.add(sourceFile.fileName);
        }
      }
    }

    let templateUpdates;
    if (useHmr && hostOptions.modifiedFiles && this.#state) {
      const componentNodes = collectHmrCandidates(
        hostOptions.modifiedFiles,
        angularProgram,
        staleSourceFiles,
      );

      for (const node of componentNodes) {
        if (!ts.isClassDeclaration(node)) {
          continue;
        }
        const componentFilename = node.getSourceFile().fileName;
        let relativePath = relative(
          compilerOptions.rootDir ?? host.getCurrentDirectory(),
          componentFilename,
        );
        if (relativePath.startsWith('..')) {
          relativePath = componentFilename;
        }
        relativePath = relativePath.replaceAll('\\', '/');
        const updateId = encodeURIComponent(
          `${host.getCanonicalFileName(relativePath)}@${node.name?.text}`,
        );
        const updateText = angularCompiler.emitHmrUpdateModule(node);
        // If compiler cannot generate an update for the component, prevent template updates.
        if (updateText === null) {
          // Build is needed if a template cannot be updated
          templateUpdates = undefined;
          break;
        }
        templateUpdates ??= new Map<string, string>();
        templateUpdates.set(updateId, updateText);
      }
    }

    // The affected files walk runs a full semantic type-check as a side effect
    // (via `getSemanticDiagnosticsOfNextAffectedFile`). Its result is only consumed to
    // scope Angular template diagnostics and to force re-emit of TS-affected files in the
    // slow TypeScript emit path. When type-checking is disabled, template/semantic
    // diagnostics are already suppressed at the consumption layer (see the compiler-plugin
    // `diagnoseFiles` mask), and in the isolatedModules fast path emit is per-file, so the
    // set is never read. Skip the walk in that case to avoid a discarded semantic pass.
    const affectedFiles =
      useTypeChecking || useTypeScriptTranspilation
        ? profileSync('NG_FIND_AFFECTED', () =>
            findAffectedFiles(
              typeScriptProgram,
              angularCompiler,
              usingBuildInfo,
              this.#state?.typeScriptProgram,
              filesWithoutDtsSignature,
            ),
          )
        : new Set<ts.SourceFile>();

    const componentResourcesDependencies = new Map<string, string[]>();

    // Get all files referenced in the TypeScript/Angular program including component resources
    const referencedFiles = [...tsConfigFiles];
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }

      referencedFiles.push(sourceFile.fileName);
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      const resourceDependencies = angularCompiler.getResourceDependencies(sourceFile);
      componentResourcesDependencies.set(sourceFile.fileName, resourceDependencies);

      if (resourceDependencies.length === 0) {
        continue;
      }

      referencedFiles.push(...resourceDependencies);

      // Also invalidate Angular diagnostics for a source file if component resources are modified
      if (this.#state && hostOptions.modifiedFiles?.size) {
        for (const resourceDependency of resourceDependencies) {
          if (
            !hostOptions.modifiedFiles.has(resourceDependency) ||
            /\.(?:css|scss|sass|less)$/i.test(resourceDependency)
          ) {
            continue;
          }

          this.#state.diagnosticCache.delete(sourceFile);

          const oldSourceFile = this.#state.typeScriptProgram.getSourceFile(sourceFile.fileName);
          if (oldSourceFile) {
            this.#state.diagnosticCache.delete(oldSourceFile);
          }

          // Also mark as affected in case changed template affects diagnostics
          affectedFiles.add(sourceFile);
          break;
        }
      }
    }

    this.#state = new AngularCompilationState(
      angularProgram,
      host,
      typeScriptProgram,
      affectedFiles,
      affectedFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram,
      createWorkerTransformer(hostOptions.processWebWorker.bind(hostOptions)),
      useTypeScriptTranspilation,
      this.#state?.diagnosticCache,
      filesWithoutDtsSignature,
      useFallbackRootNames,
    );

    return {
      compilerOptions,
      referencedFiles,
      externalStylesheets: hostOptions.externalStylesheets,
      templateUpdates,
      componentResourcesDependencies,
      warnings,
    };
  }

  protected override *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
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

    try {
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
            () =>
              angularCompiler.getDiagnosticsForFile(sourceFile, templateDiagnosticsOptimization),
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
    } finally {
      // Angular's template typechecker lazily creates `.ngtypecheck.ts` shims in a new `ts.Program`
      // during `getDiagnosticsForFile`. Sync the builder program with `angularCompiler.getCurrentProgram()`
      // so the next incremental build does not treat all `.ngtypecheck.ts` files as newly added files.
      const currentTsProgram = angularCompiler.getCurrentProgram();
      if (currentTsProgram !== typeScriptProgram.getProgram()) {
        ensureSourceFileVersions(currentTsProgram, typeScriptProgram);
        this.#state.typeScriptProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
          currentTsProgram,
          this.#state.compilerHost,
          typeScriptProgram,
        );

        const baseEmit = currentTsProgram.emit;
        currentTsProgram.emit = () => ({ emitSkipped: true, diagnostics: [] });
        try {
          while (
            this.#state.typeScriptProgram.getSemanticDiagnosticsOfNextAffectedFile(
              undefined,
              () => true,
            )
          ) {
            /* empty */
          }
        } finally {
          currentTsProgram.emit = baseEmit;
        }
      }
    }
  }

  override emitAffectedFiles(): Iterable<EmitFileResult> {
    assert(this.#state, 'Angular compilation must be initialized prior to emitting files.');
    const {
      affectedFiles,
      angularCompiler,
      compilerHost,
      typeScriptProgram,
      webWorkerTransform,
      useTypeScriptTranspilation,
    } = this.#state;
    const compilerOptions = typeScriptProgram.getCompilerOptions();
    const isLibraryEmit = !!compilerOptions.declaration;
    const buildInfoFilename = compilerOptions.tsBuildInfoFile ?? '.tsbuildinfo';

    const emittedFiles = new Map<string, EmitFileResult>();
    const emittedSourceFiles = new Set<ts.SourceFile>();
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
      emittedSourceFiles.add(sourceFile);
      const targetFilename = isLibraryEmit ? filename : sourceFile.fileName;
      emittedFiles.set(targetFilename, { filename: targetFilename, contents });
    };
    const transformers = angularCompiler.prepareEmit().transformers;
    if (!isLibraryEmit) {
      transformers.before ??= [];
      transformers.before.push(
        replaceBootstrap(() => typeScriptProgram.getProgram().getTypeChecker()),
        webWorkerTransform,
      );

      if (!this.browserOnlyBuild) {
        transformers.before.push(lazyRoutesTransformer(compilerOptions, compilerHost));
      }
    }

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
      if (emittedSourceFiles.has(sourceFile) || angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }

      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (
        angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile) &&
        (!useTypeScriptTranspilation || !affectedFiles.has(sourceFile))
      ) {
        continue;
      }

      if (useTypeScriptTranspilation) {
        const emitOnly = affectedFiles.has(sourceFile) ? undefined : false;
        typeScriptProgram.emit(sourceFile, writeFileCallback, undefined, emitOnly, transformers);
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

      let contents: string;
      if (sourceFile === transformResult.transformed[0]) {
        // Use original content if no changes were made
        contents = sourceFile.text;
      } else {
        // Otherwise, print the transformed source file with map if needed
        const printer = ts.createPrinter(compilerOptions, transformResult);
        const printResult = printSourceFileWithMap(
          transformResult.transformed[0],
          printer,
          compilerHost,
          compilerOptions,
        );

        contents = printResult.code;

        if (printResult.map) {
          if (compilerOptions.inlineSourceMap) {
            const base64Map = Buffer.from(printResult.map).toString('base64');
            contents += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
          } else if (compilerOptions.sourceMap) {
            const mapFilename = sourceFile.fileName + '.map';
            emittedFiles.set(mapFilename, { filename: mapFilename, contents: printResult.map });
          }
        }
      }

      angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
      emittedSourceFiles.add(sourceFile);
      emittedFiles.set(sourceFile.fileName, { filename: sourceFile.fileName, contents });
    }

    return emittedFiles.values();
  }
}

function findAffectedFiles(
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  { ignoreForDiagnostics, incrementalCompilation }: ng.NgtscProgram['compiler'],
  includeTTC: boolean,
  oldBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined,
  filesWithoutDtsSignature: Set<string>,
): Set<ts.SourceFile> {
  const affectedFiles = new Set<ts.SourceFile>();

  // Temporarily disable `isolatedModules` and `verbatimModuleSyntax` while walking affected
  // files so TypeScript's `getFilesAffectedByUpdatedShapeWhenModuleEmit` yields dependent
  // `.ngtypecheck.ts` shims to the `ignoreSourceFile` callback when a file's `.d.ts` shape
  // changes, instead of returning only the modified file itself.
  const compilerOptions = builder.getCompilerOptions();
  const prevIsolatedModules = compilerOptions.isolatedModules;
  const prevVerbatimModuleSyntax = compilerOptions.verbatimModuleSyntax;
  compilerOptions.isolatedModules = false;
  compilerOptions.verbatimModuleSyntax = false;

  const program = builder.getProgram();
  const baseEmit = program.emit;
  const oldProgram = oldBuilder?.getProgram();
  program.emit = (
    targetSourceFile,
    writeFile,
    cancellationToken,
    emitOnly,
    customTransformers,
    ...rest
  ) => {
    if (targetSourceFile) {
      if (isNgTypeCheckFile(targetSourceFile.fileName)) {
        return { emitSkipped: true, diagnostics: [] };
      }

      if (oldProgram && filesWithoutDtsSignature.has(targetSourceFile.fileName)) {
        const oldSourceFile = oldProgram.getSourceFile(targetSourceFile.fileName);
        if (oldSourceFile) {
          let oldDtsText: string | undefined;
          let oldHasDiagnostics = false;
          oldProgram.emit(
            oldSourceFile,
            (_fileName, text, _bom, _onError, _sourceFiles, data) => {
              oldDtsText = text;
              oldHasDiagnostics = !!(data as { diagnostics?: unknown[] } | undefined)?.diagnostics
                ?.length;
            },
            cancellationToken,
            emitOnly,
            customTransformers,
            ...(rest as []),
          );

          return baseEmit.call(
            program,
            targetSourceFile,
            (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
              const newHasDiagnostics = !!(data as { diagnostics?: unknown[] } | undefined)
                ?.diagnostics?.length;
              if (text !== oldDtsText || newHasDiagnostics !== oldHasDiagnostics) {
                filesWithoutDtsSignature.delete(targetSourceFile.fileName);
                writeFile?.(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
              }
            },
            cancellationToken,
            emitOnly,
            customTransformers,
            ...(rest as []),
          );
        }

        filesWithoutDtsSignature.delete(targetSourceFile.fileName);
      }
    }

    return baseEmit.call(
      program,
      targetSourceFile,
      writeFile,
      cancellationToken,
      emitOnly,
      customTransformers,
      ...(rest as []),
    );
  };

  try {
    while (
      builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        if (ignoreForDiagnostics.has(sourceFile)) {
          // If the affected file is a TTC shim, add the shim's original source file.
          // This ensures that changes that affect TTC are typechecked even when the changes
          // are otherwise unrelated from a TS perspective and do not result in Ivy codegen changes.
          // For example, changing @Input property types of a directive used in another component's
          // template.
          // A TTC shim is a file that has been ignored for diagnostics and has a filename ending in `.ngtypecheck.ts`.
          if (isNgTypeCheckFile(sourceFile.fileName)) {
            // This file name conversion relies on internal compiler logic and should be converted
            // to an official method when available. 15 is length of `.ngtypecheck.ts`
            const originalFilename = getOriginalFilename(sourceFile.fileName);
            const originalSourceFile = builder.getSourceFile(originalFilename);
            if (originalSourceFile) {
              affectedFiles.add(originalSourceFile);
            }
          }
        } else {
          affectedFiles.add(sourceFile);
        }

        return true;
      })
    ) {
      /* empty */
    }
  } finally {
    program.emit = baseEmit;
    compilerOptions.isolatedModules = prevIsolatedModules;
    compilerOptions.verbatimModuleSyntax = prevVerbatimModuleSyntax;
  }

  // Also include files identified by Angular's incremental compilation graph as needing
  // re-emission or template re-typechecking (such as selector renames or required input changes
  // that only affect Angular metadata without altering standard TypeScript `.d.ts` signatures).
  for (const sourceFile of builder.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || ignoreForDiagnostics.has(sourceFile)) {
      continue;
    }

    if (
      !incrementalCompilation.safeToSkipEmit(sourceFile) ||
      incrementalCompilation.priorTypeCheckingResultsFor(sourceFile) === null
    ) {
      affectedFiles.add(sourceFile);
    }
  }

  // Add all files with associated template type checking files.
  // Stored TS build info does not have knowledge of the AOT compiler or the typechecking state of the templates.
  // To ensure that errors are reported correctly, all AOT component diagnostics need to be analyzed even if build
  // info is present.
  if (includeTTC) {
    for (const sourceFile of builder.getSourceFiles()) {
      if (ignoreForDiagnostics.has(sourceFile) && isNgTypeCheckFile(sourceFile.fileName)) {
        // This file name conversion relies on internal compiler logic and should be converted
        // to an official method when available. 15 is length of `.ngtypecheck.ts`
        const originalFilename = getOriginalFilename(sourceFile.fileName);
        const originalSourceFile = builder.getSourceFile(originalFilename);
        if (originalSourceFile) {
          affectedFiles.add(originalSourceFile);
        }
      }
    }
  }

  return affectedFiles;
}

/**
 * Ensures `.d.ts` shape signatures are computed on the previous `BuilderProgram` for modified
 * files before the next `BuilderProgram` is created.
 *
 * On the initial build (`oldProgram === undefined`), TypeScript initializes each file's shape
 * signature to its `.ts` source version hash rather than emitting `.d.ts` declarations for every
 * file. When a file is modified on a watch rebuild, TypeScript computes its new `.d.ts` signature
 * and compares it against the previous program's stored signature. Emitting the `.d.ts` signature
 * on `oldProgram` for the modified file replaces its initial `.ts` version hash with its true
 * `.d.ts` signature prior to diffing, avoiding false-positive `.d.ts` cascades across importers.
 */
function populatePreviousDtsSignatures(
  oldProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  modifiedFiles: ReadonlySet<string>,
  filesWithoutDtsSignature: Set<string>,
): void {
  const filesToUpdate: ts.SourceFile[] = [];
  for (const modifiedFile of modifiedFiles) {
    const sf = oldProgram.getSourceFile(modifiedFile);
    if (sf && !sf.isDeclarationFile && filesWithoutDtsSignature.delete(sf.fileName)) {
      filesToUpdate.push(sf);
    }
  }

  if (filesToUpdate.length === 0) {
    return;
  }

  const compilerOptions = oldProgram.getCompilerOptions();
  const prevDeclaration = compilerOptions.declaration;
  const prevComposite = compilerOptions.composite;
  const prevNoEmit = compilerOptions.noEmit;
  const prevNoEmitOnError = compilerOptions.noEmitOnError;

  compilerOptions.declaration = true;
  compilerOptions.composite = false;
  compilerOptions.noEmit = false;
  compilerOptions.noEmitOnError = false;

  const program = oldProgram.getProgram();
  const baseEmit = program.emit as (
    targetSourceFile?: ts.SourceFile,
    writeFile?: ts.WriteFileCallback,
    cancellationToken?: ts.CancellationToken,
    emitOnlyDtsFiles?: boolean | number,
    customTransformers?: ts.CustomTransformers,
    forceDtsEmit?: boolean,
  ) => ts.EmitResult;
  program.emit = (targetSourceFile, writeFile, cancellationToken) =>
    baseEmit.call(
      program,
      targetSourceFile,
      writeFile,
      cancellationToken,
      2, // ts.EmitOnly.BuilderSignature
      undefined,
      true, // forceDtsEmit
    );

  try {
    for (const sf of filesToUpdate) {
      oldProgram.emit(sf, () => {}, undefined, true);
    }
  } finally {
    program.emit = baseEmit;
    compilerOptions.declaration = prevDeclaration;
    compilerOptions.composite = prevComposite;
    compilerOptions.noEmit = prevNoEmit;
    compilerOptions.noEmitOnError = prevNoEmitOnError;
  }
}

/**
 * Checks whether the analyzed Angular program contains any non-standalone `@Component`
 * declarations in user source files that lack an owning `NgModule` scope.
 */
function hasUnscopedComponent(angularCompiler: ng.NgCompiler): boolean {
  // `incrementalCompilation.state` is typed as the `IncrementalState` union
  // (`AnalyzedIncrementalState | DeltaIncrementalState | FreshIncrementalState`), where only
  // `AnalyzedIncrementalState` (populated once `analyzeAsync()` completes) contains
  // `priorAnalysis`. Because the `IncrementalStateKind` discriminant enum is not re-exported
  // from `@angular/compiler-cli`, narrow the union via `'priorAnalysis' in state`.
  const state = angularCompiler.incrementalCompilation.state;
  if (!('priorAnalysis' in state)) {
    return false;
  }

  let templateTypeChecker: ReturnType<ng.NgCompiler['getTemplateTypeChecker']> | undefined;

  for (const [sourceFile, records] of state.priorAnalysis) {
    if (records.length === 0 || angularCompiler.ignoreForEmit.has(sourceFile)) {
      continue;
    }

    for (const { node } of records) {
      if (!ts.isClassDeclaration(node)) {
        continue;
      }

      const meta = angularCompiler.getMeta(node);
      if (meta && 'isComponent' in meta && meta.isComponent && !meta.isStandalone) {
        if (!templateTypeChecker) {
          // `NgtscProgram` initializes `NgCompiler` with `enableTemplateTypeChecker = false`, which
          // guards the public `getTemplateTypeChecker()` getter. Temporarily enable the flag after
          // `analyzeAsync()` has already constructed `TemplateTypeCheckerImpl` so we can query
          // `getOwningNgModule()` without altering `typeCheckingConfig.enableTemplateTypeChecker`.
          const compiler = angularCompiler as { enableTemplateTypeChecker: boolean };
          const previous = compiler.enableTemplateTypeChecker;
          try {
            compiler.enableTemplateTypeChecker = true;
            templateTypeChecker = angularCompiler.getTemplateTypeChecker();
          } finally {
            compiler.enableTemplateTypeChecker = previous;
          }
        }

        if (templateTypeChecker.getOwningNgModule(node) === null) {
          return true;
        }
      }
    }
  }

  return false;
}
