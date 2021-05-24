/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { CompilerHost, CompilerOptions, readConfiguration } from '@angular/compiler-cli';
import { NgtscProgram } from '@angular/compiler-cli/src/ngtsc/program';
import { createHash } from 'crypto';
import * as ts from 'typescript';
import {
  Compilation,
  Compiler,
  Module,
  NormalModule,
  NormalModuleReplacementPlugin,
  util,
} from 'webpack';
import { NgccProcessor } from '../ngcc_processor';
import { TypeScriptPathsPlugin } from '../paths-plugin';
import { WebpackResourceLoader } from '../resource_loader';
import { addError, addWarning } from '../webpack-diagnostics';
import { SourceFileCache } from './cache';
import { DiagnosticsReporter, createDiagnosticsReporter } from './diagnostics';
import {
  augmentHostWithCaching,
  augmentHostWithDependencyCollection,
  augmentHostWithNgcc,
  augmentHostWithReplacements,
  augmentHostWithResources,
  augmentHostWithSubstitutions,
  augmentProgramWithVersioning,
} from './host';
import { externalizePath, normalizePath } from './paths';
import { AngularPluginSymbol, EmitFileResult, FileEmitter, FileEmitterCollection } from './symbol';
import { InputFileSystemSync, createWebpackSystem } from './system';
import { createAotTransformers, createJitTransformers, mergeTransformers } from './transformation';

/**
 * The threshold used to determine whether Angular file diagnostics should optimize for full programs
 * or single files. If the number of affected files for a build is more than the threshold, full
 * program optimization will be used.
 */
const DIAGNOSTICS_AFFECTED_THRESHOLD = 1;

export interface AngularWebpackPluginOptions {
  tsconfig: string;
  compilerOptions?: CompilerOptions;
  fileReplacements: Record<string, string>;
  substitutions: Record<string, string>;
  directTemplateLoading: boolean;
  emitClassMetadata: boolean;
  emitNgModuleScope: boolean;
  jitMode: boolean;
  inlineStyleMimeType?: string;
  inlineStyleFileExtension?: string;
}

// Add support for missing properties in Webpack types as well as the loader's file emitter
interface WebpackCompilation extends Compilation {
  [AngularPluginSymbol]: FileEmitterCollection;
}

function initializeNgccProcessor(
  compiler: Compiler,
  tsconfig: string,
): { processor: NgccProcessor; errors: string[]; warnings: string[] } {
  const { inputFileSystem, options: webpackOptions } = compiler;
  const mainFields = webpackOptions.resolve?.mainFields?.flat() ?? [];

  const errors: string[] = [];
  const warnings: string[] = [];
  const processor = new NgccProcessor(
    mainFields,
    warnings,
    errors,
    compiler.context,
    tsconfig,
    inputFileSystem,
    webpackOptions.resolve?.symlinks,
  );

  return { processor, errors, warnings };
}

function hashContent(content: string): Uint8Array {
  return createHash('md5').update(content).digest();
}

const PLUGIN_NAME = 'angular-compiler';

export class AngularWebpackPlugin {
  private readonly pluginOptions: AngularWebpackPluginOptions;
  private watchMode?: boolean;
  private ngtscNextProgram?: NgtscProgram;
  private builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private sourceFileCache?: SourceFileCache;
  private readonly fileDependencies = new Map<string, Set<string>>();
  private readonly requiredFilesToEmit = new Set<string>();
  private readonly requiredFilesToEmitCache = new Map<string, EmitFileResult | undefined>();
  private readonly fileEmitHistory = new Map<string, { length: number; hash: Uint8Array }>();

  constructor(options: Partial<AngularWebpackPluginOptions> = {}) {
    this.pluginOptions = {
      emitClassMetadata: false,
      emitNgModuleScope: false,
      jitMode: false,
      fileReplacements: {},
      substitutions: {},
      directTemplateLoading: true,
      tsconfig: 'tsconfig.json',
      ...options,
    };
  }

  get options(): AngularWebpackPluginOptions {
    return this.pluginOptions;
  }

  apply(compiler: Compiler): void {
    // Setup file replacements with webpack
    for (const [key, value] of Object.entries(this.pluginOptions.fileReplacements)) {
      new NormalModuleReplacementPlugin(
        new RegExp('^' + key.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&') + '$'),
        value,
      ).apply(compiler);
    }

    // Set resolver options
    const pathsPlugin = new TypeScriptPathsPlugin();
    compiler.hooks.afterResolvers.tap('angular-compiler', (compiler) => {
      // When Ivy is enabled we need to add the fields added by NGCC
      // to take precedence over the provided mainFields.
      // NGCC adds fields in package.json suffixed with '_ivy_ngcc'
      // Example: module -> module__ivy_ngcc
      compiler.resolverFactory.hooks.resolveOptions
        .for('normal')
        .tap(PLUGIN_NAME, (resolveOptions) => {
          const originalMainFields = resolveOptions.mainFields;
          const ivyMainFields = originalMainFields?.flat().map((f) => `${f}_ivy_ngcc`) ?? [];

          resolveOptions.plugins ??= [];
          resolveOptions.plugins.push(pathsPlugin);

          // https://github.com/webpack/webpack/issues/11635#issuecomment-707016779
          return util.cleverMerge(resolveOptions, { mainFields: [...ivyMainFields, '...'] });
        });
    });

    let ngccProcessor: NgccProcessor | undefined;
    let resourceLoader: WebpackResourceLoader | undefined;
    let previousUnused: Set<string> | undefined;
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (thisCompilation) => {
      const compilation = thisCompilation as WebpackCompilation;

      // Register plugin to ensure deterministic emit order in multi-plugin usage
      if (!compilation[AngularPluginSymbol]) {
        compilation[AngularPluginSymbol] = new FileEmitterCollection();
      }
      const emitRegistration = compilation[AngularPluginSymbol].register();

      // Store watch mode; assume true if not present (webpack < 4.23.0)
      this.watchMode = compiler.watchMode ?? true;

      // Initialize the resource loader if not already setup
      if (!resourceLoader) {
        resourceLoader = new WebpackResourceLoader(this.watchMode);
      }

      // Initialize and process eager ngcc if not already setup
      if (!ngccProcessor) {
        const { processor, errors, warnings } = initializeNgccProcessor(
          compiler,
          this.pluginOptions.tsconfig,
        );

        processor.process();
        warnings.forEach((warning) => addWarning(compilation, warning));
        errors.forEach((error) => addError(compilation, error));

        ngccProcessor = processor;
      }

      // Setup and read TypeScript and Angular compiler configuration
      const { compilerOptions, rootNames, errors } = this.loadConfiguration(compilation);

      // Create diagnostics reporter and report configuration file errors
      const diagnosticsReporter = createDiagnosticsReporter(compilation);
      diagnosticsReporter(errors);

      // Update TypeScript path mapping plugin with new configuration
      pathsPlugin.update(compilerOptions);

      // Create a Webpack-based TypeScript compiler host
      const system = createWebpackSystem(
        // Webpack lacks an InputFileSytem type definition with sync functions
        compiler.inputFileSystem as InputFileSystemSync,
        normalizePath(compiler.context),
      );
      const host = ts.createIncrementalCompilerHost(compilerOptions, system);

      // Setup source file caching and reuse cache from previous compilation if present
      let cache = this.sourceFileCache;
      let changedFiles;
      if (cache) {
        changedFiles = new Set<string>();
        for (const changedFile of [...compiler.modifiedFiles, ...compiler.removedFiles]) {
          const normalizedChangedFile = normalizePath(changedFile);
          // Invalidate file dependencies
          this.fileDependencies.delete(normalizedChangedFile);
          // Invalidate existing cache
          cache.invalidate(normalizedChangedFile);

          changedFiles.add(normalizedChangedFile);
        }
      } else {
        // Initialize a new cache
        cache = new SourceFileCache();
        // Only store cache if in watch mode
        if (this.watchMode) {
          this.sourceFileCache = cache;
        }
      }
      augmentHostWithCaching(host, cache);

      const moduleResolutionCache = ts.createModuleResolutionCache(
        host.getCurrentDirectory(),
        host.getCanonicalFileName.bind(host),
        compilerOptions,
      );

      // Setup source file dependency collection
      augmentHostWithDependencyCollection(host, this.fileDependencies, moduleResolutionCache);

      // Setup on demand ngcc
      augmentHostWithNgcc(host, ngccProcessor, moduleResolutionCache);

      // Setup resource loading
      resourceLoader.update(compilation, changedFiles);
      augmentHostWithResources(host, resourceLoader, {
        directTemplateLoading: this.pluginOptions.directTemplateLoading,
        inlineStyleMimeType: this.pluginOptions.inlineStyleMimeType,
        inlineStyleFileExtension: this.pluginOptions.inlineStyleFileExtension,
      });

      // Setup source file adjustment options
      augmentHostWithReplacements(host, this.pluginOptions.fileReplacements, moduleResolutionCache);
      augmentHostWithSubstitutions(host, this.pluginOptions.substitutions);

      // Create the file emitter used by the webpack loader
      const { fileEmitter, builder, internalFiles } = this.pluginOptions.jitMode
        ? this.updateJitProgram(compilerOptions, rootNames, host, diagnosticsReporter)
        : this.updateAotProgram(
            compilerOptions,
            rootNames,
            host,
            diagnosticsReporter,
            resourceLoader,
          );

      // Set of files used during the unused TypeScript file analysis
      const currentUnused = new Set<string>();

      for (const sourceFile of builder.getSourceFiles()) {
        if (internalFiles?.has(sourceFile)) {
          continue;
        }

        // Ensure all program files are considered part of the compilation and will be watched
        compilation.fileDependencies.add(sourceFile.fileName);

        // Add all non-declaration files to the initial set of unused files. The set will be
        // analyzed and pruned after all Webpack modules are finished building.
        if (!sourceFile.isDeclarationFile) {
          currentUnused.add(normalizePath(sourceFile.fileName));
        }
      }

      compilation.hooks.finishModules.tapPromise(PLUGIN_NAME, async (modules) => {
        // Rebuild any remaining AOT required modules
        await this.rebuildRequiredFiles(modules, compilation, fileEmitter);

        // Clear out the Webpack compilation to avoid an extra retaining reference
        resourceLoader?.clearParentCompilation();

        // Analyze program for unused files
        if (compilation.errors.length > 0) {
          return;
        }

        for (const webpackModule of modules) {
          const resource = (webpackModule as NormalModule).resource;
          if (resource) {
            this.markResourceUsed(normalizePath(resource), currentUnused);
          }
        }

        for (const unused of currentUnused) {
          if (previousUnused && previousUnused.has(unused)) {
            continue;
          }
          addWarning(
            compilation,
            `${unused} is part of the TypeScript compilation but it's unused.\n` +
              `Add only entry points to the 'files' or 'include' properties in your tsconfig.`,
          );
        }
        previousUnused = currentUnused;
      });

      // Store file emitter for loader usage
      emitRegistration.update(fileEmitter);
    });
  }

  private markResourceUsed(normalizedResourcePath: string, currentUnused: Set<string>): void {
    if (!currentUnused.has(normalizedResourcePath)) {
      return;
    }

    currentUnused.delete(normalizedResourcePath);
    const dependencies = this.fileDependencies.get(normalizedResourcePath);
    if (!dependencies) {
      return;
    }
    for (const dependency of dependencies) {
      this.markResourceUsed(normalizePath(dependency), currentUnused);
    }
  }

  private async rebuildRequiredFiles(
    modules: Iterable<Module>,
    compilation: WebpackCompilation,
    fileEmitter: FileEmitter,
  ): Promise<void> {
    if (this.requiredFilesToEmit.size === 0) {
      return;
    }

    const filesToRebuild = new Set<string>();
    for (const requiredFile of this.requiredFilesToEmit) {
      const history = this.fileEmitHistory.get(requiredFile);
      if (history) {
        const emitResult = await fileEmitter(requiredFile);
        if (
          emitResult?.content === undefined ||
          history.length !== emitResult.content.length ||
          emitResult.hash === undefined ||
          Buffer.compare(history.hash, emitResult.hash) !== 0
        ) {
          // New emit result is different so rebuild using new emit result
          this.requiredFilesToEmitCache.set(requiredFile, emitResult);
          filesToRebuild.add(requiredFile);
        }
      } else {
        // No emit history so rebuild
        filesToRebuild.add(requiredFile);
      }
    }

    if (filesToRebuild.size > 0) {
      const rebuild = (webpackModule: Module) =>
        new Promise<void>((resolve) => compilation.rebuildModule(webpackModule, () => resolve()));

      const modulesToRebuild = [];
      for (const webpackModule of modules) {
        const resource = (webpackModule as NormalModule).resource;
        if (resource && filesToRebuild.has(normalizePath(resource))) {
          modulesToRebuild.push(webpackModule);
        }
      }
      await Promise.all(modulesToRebuild.map((webpackModule) => rebuild(webpackModule)));
    }

    this.requiredFilesToEmit.clear();
    this.requiredFilesToEmitCache.clear();
  }

  private loadConfiguration(compilation: WebpackCompilation) {
    const {
      options: compilerOptions,
      rootNames,
      errors,
    } = readConfiguration(this.pluginOptions.tsconfig, this.pluginOptions.compilerOptions);
    compilerOptions.enableIvy = true;
    compilerOptions.noEmitOnError = false;
    compilerOptions.suppressOutputPathCheck = true;
    compilerOptions.outDir = undefined;
    compilerOptions.inlineSources = compilerOptions.sourceMap;
    compilerOptions.inlineSourceMap = false;
    compilerOptions.mapRoot = undefined;
    compilerOptions.sourceRoot = undefined;
    compilerOptions.allowEmptyCodegenFiles = false;
    compilerOptions.annotationsAs = 'decorators';
    compilerOptions.enableResourceInlining = false;

    return { compilerOptions, rootNames, errors };
  }

  private updateAotProgram(
    compilerOptions: CompilerOptions,
    rootNames: string[],
    host: CompilerHost,
    diagnosticsReporter: DiagnosticsReporter,
    resourceLoader: WebpackResourceLoader,
  ) {
    // Create the Angular specific program that contains the Angular compiler
    const angularProgram = new NgtscProgram(
      rootNames,
      compilerOptions,
      host,
      this.ngtscNextProgram,
    );
    const angularCompiler = angularProgram.compiler;

    // The `ignoreForEmit` return value can be safely ignored when emitting. Only files
    // that will be bundled (requested by Webpack) will be emitted. Combined with TypeScript's
    // eliding of type only imports, this will cause type only files to be automatically ignored.
    // Internal Angular type check files are also not resolvable by the bundler. Even if they
    // were somehow errantly imported, the bundler would error before an emit was attempted.
    // Diagnostics are still collected for all files which requires using `ignoreForDiagnostics`.
    const { ignoreForDiagnostics, ignoreForEmit } = angularCompiler;

    // SourceFile versions are required for builder programs.
    // The wrapped host inside NgtscProgram adds additional files that will not have versions.
    const typeScriptProgram = angularProgram.getTsProgram();
    augmentProgramWithVersioning(typeScriptProgram);

    let builder: ts.BuilderProgram | ts.EmitAndSemanticDiagnosticsBuilderProgram;
    if (this.watchMode) {
      builder = this.builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        typeScriptProgram,
        host,
        this.builder,
      );
      this.ngtscNextProgram = angularProgram;
    } else {
      // When not in watch mode, the startup cost of the incremental analysis can be avoided by
      // using an abstract builder that only wraps a TypeScript program.
      builder = ts.createAbstractBuilder(typeScriptProgram, host);
    }

    // Update semantic diagnostics cache
    const affectedFiles = new Set<ts.SourceFile>();

    // Analyze affected files when in watch mode for incremental type checking
    if ('getSemanticDiagnosticsOfNextAffectedFile' in builder) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
          // If the affected file is a TTC shim, add the shim's original source file.
          // This ensures that changes that affect TTC are typechecked even when the changes
          // are otherwise unrelated from a TS perspective and do not result in Ivy codegen changes.
          // For example, changing @Input property types of a directive used in another component's
          // template.
          if (
            ignoreForDiagnostics.has(sourceFile) &&
            sourceFile.fileName.endsWith('.ngtypecheck.ts')
          ) {
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
    }

    // Collect non-semantic diagnostics
    const diagnostics = [
      ...angularCompiler.getOptionDiagnostics(),
      ...builder.getOptionsDiagnostics(),
      ...builder.getGlobalDiagnostics(),
      ...builder.getSyntacticDiagnostics(),
    ];
    diagnosticsReporter(diagnostics);

    // Collect semantic diagnostics
    for (const sourceFile of builder.getSourceFiles()) {
      if (!ignoreForDiagnostics.has(sourceFile)) {
        diagnosticsReporter(builder.getSemanticDiagnostics(sourceFile));
      }
    }

    const transformers = createAotTransformers(builder, this.pluginOptions);

    const getDependencies = (sourceFile: ts.SourceFile) => {
      const dependencies = [];
      for (const resourcePath of angularCompiler.getResourceDependencies(sourceFile)) {
        dependencies.push(
          resourcePath,
          // Retrieve all dependencies of the resource (stylesheet imports, etc.)
          ...resourceLoader.getResourceDependencies(resourcePath),
        );
      }

      return dependencies;
    };

    // Required to support asynchronous resource loading
    // Must be done before creating transformers or getting template diagnostics
    const pendingAnalysis = angularCompiler.analyzeAsync().then(() => {
      this.requiredFilesToEmit.clear();

      for (const sourceFile of builder.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) {
          continue;
        }

        // Collect sources that are required to be emitted
        if (
          !ignoreForEmit.has(sourceFile) &&
          !angularCompiler.incrementalDriver.safeToSkipEmit(sourceFile)
        ) {
          this.requiredFilesToEmit.add(normalizePath(sourceFile.fileName));

          // If required to emit, diagnostics may have also changed
          if (!ignoreForDiagnostics.has(sourceFile)) {
            affectedFiles.add(sourceFile);
          }
        } else if (
          this.sourceFileCache &&
          !affectedFiles.has(sourceFile) &&
          !ignoreForDiagnostics.has(sourceFile)
        ) {
          // Use cached Angular diagnostics for unchanged and unaffected files
          const angularDiagnostics = this.sourceFileCache.getAngularDiagnostics(sourceFile);
          if (angularDiagnostics) {
            diagnosticsReporter(angularDiagnostics);
          }
        }
      }

      // Collect new Angular diagnostics for files affected by changes
      const { OptimizeFor } = require('@angular/compiler-cli/src/ngtsc/typecheck/api');
      const optimizeDiagnosticsFor =
        affectedFiles.size <= DIAGNOSTICS_AFFECTED_THRESHOLD
          ? OptimizeFor.SingleFile
          : OptimizeFor.WholeProgram;
      for (const affectedFile of affectedFiles) {
        const angularDiagnostics = angularCompiler.getDiagnosticsForFile(
          affectedFile,
          optimizeDiagnosticsFor,
        );
        diagnosticsReporter(angularDiagnostics);
        this.sourceFileCache?.updateAngularDiagnostics(affectedFile, angularDiagnostics);
      }

      return this.createFileEmitter(
        builder,
        mergeTransformers(angularCompiler.prepareEmit().transformers, transformers),
        getDependencies,
        (sourceFile) => {
          this.requiredFilesToEmit.delete(normalizePath(sourceFile.fileName));
          angularCompiler.incrementalDriver.recordSuccessfulEmit(sourceFile);
        },
      );
    });
    const analyzingFileEmitter: FileEmitter = async (file) => {
      const innerFileEmitter = await pendingAnalysis;

      return innerFileEmitter(file);
    };

    return {
      fileEmitter: analyzingFileEmitter,
      builder,
      internalFiles: ignoreForEmit,
    };
  }

  private updateJitProgram(
    compilerOptions: CompilerOptions,
    rootNames: readonly string[],
    host: CompilerHost,
    diagnosticsReporter: DiagnosticsReporter,
  ) {
    let builder;
    if (this.watchMode) {
      builder = this.builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        rootNames,
        compilerOptions,
        host,
        this.builder,
      );
    } else {
      // When not in watch mode, the startup cost of the incremental analysis can be avoided by
      // using an abstract builder that only wraps a TypeScript program.
      builder = ts.createAbstractBuilder(rootNames, compilerOptions, host);
    }

    const diagnostics = [
      ...builder.getOptionsDiagnostics(),
      ...builder.getGlobalDiagnostics(),
      ...builder.getSyntacticDiagnostics(),
      // Gather incremental semantic diagnostics
      ...builder.getSemanticDiagnostics(),
    ];
    diagnosticsReporter(diagnostics);

    const transformers = createJitTransformers(builder, this.pluginOptions);

    return {
      fileEmitter: this.createFileEmitter(builder, transformers, () => []),
      builder,
      internalFiles: undefined,
    };
  }

  private createFileEmitter(
    program: ts.BuilderProgram,
    transformers: ts.CustomTransformers = {},
    getExtraDependencies: (sourceFile: ts.SourceFile) => Iterable<string>,
    onAfterEmit?: (sourceFile: ts.SourceFile) => void,
  ): FileEmitter {
    return async (file: string) => {
      const filePath = normalizePath(file);
      if (this.requiredFilesToEmitCache.has(filePath)) {
        return this.requiredFilesToEmitCache.get(filePath);
      }

      const sourceFile = program.getSourceFile(filePath);
      if (!sourceFile) {
        return undefined;
      }

      let content: string | undefined;
      let map: string | undefined;
      program.emit(
        sourceFile,
        (filename, data) => {
          if (filename.endsWith('.map')) {
            map = data;
          } else if (filename.endsWith('.js')) {
            content = data;
          }
        },
        undefined,
        undefined,
        transformers,
      );

      onAfterEmit?.(sourceFile);

      let hash;
      if (content !== undefined && this.watchMode) {
        // Capture emit history info for Angular rebuild analysis
        hash = hashContent(content);
        this.fileEmitHistory.set(filePath, { length: content.length, hash });
      }

      const dependencies = [
        ...(this.fileDependencies.get(filePath) || []),
        ...getExtraDependencies(sourceFile),
      ].map(externalizePath);

      return { content, map, dependencies, hash };
    };
  }
}
