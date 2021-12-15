/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { CompilerHost, CompilerOptions, NgtscProgram } from '@angular/compiler-cli';
import { strict as assert } from 'assert';
import { createHash } from 'crypto';
import * as ts from 'typescript';
import type { Compilation, Compiler, Module, NormalModule } from 'webpack';
import { NgccProcessor } from '../ngcc_processor';
import { TypeScriptPathsPlugin } from '../paths-plugin';
import { WebpackResourceLoader } from '../resource_loader';
import { SourceFileCache } from './cache';
import {
  DiagnosticsReporter,
  addError,
  addWarning,
  createDiagnosticsReporter,
} from './diagnostics';
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
  inlineStyleFileExtension?: string;
}

function initializeNgccProcessor(
  compiler: Compiler,
  tsconfig: string,
  compilerNgccModule: typeof import('@angular/compiler-cli/ngcc') | undefined,
): { processor: NgccProcessor; errors: string[]; warnings: string[] } {
  const { inputFileSystem, options: webpackOptions } = compiler;
  const mainFields = webpackOptions.resolve?.mainFields?.flat() ?? [];

  const errors: string[] = [];
  const warnings: string[] = [];
  const resolver = compiler.resolverFactory.get('normal', {
    // Caching must be disabled because it causes the resolver to become async after a rebuild
    cache: false,
    extensions: ['.json'],
    useSyncFileSystemCalls: true,
  });

  // The compilerNgccModule field is guaranteed to be defined during a compilation
  // due to the `beforeCompile` hook. Usage of this property accessor prior to the
  // hook execution is an implementation error.
  assert.ok(compilerNgccModule, `'@angular/compiler-cli/ngcc' used prior to Webpack compilation.`);

  const processor = new NgccProcessor(
    compilerNgccModule,
    mainFields,
    warnings,
    errors,
    compiler.context,
    tsconfig,
    inputFileSystem,
    resolver,
  );

  return { processor, errors, warnings };
}

const PLUGIN_NAME = 'angular-compiler';
const compilationFileEmitters = new WeakMap<Compilation, FileEmitterCollection>();

interface FileEmitHistoryItem {
  length: number;
  hash: Uint8Array;
}

export class AngularWebpackPlugin {
  private readonly pluginOptions: AngularWebpackPluginOptions;
  private compilerCliModule?: typeof import('@angular/compiler-cli');
  private compilerNgccModule?: typeof import('@angular/compiler-cli/ngcc');
  private watchMode?: boolean;
  private ngtscNextProgram?: NgtscProgram;
  private builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private sourceFileCache?: SourceFileCache;
  private webpackCache?: ReturnType<Compilation['getCache']>;
  private readonly fileDependencies = new Map<string, Set<string>>();
  private readonly requiredFilesToEmit = new Set<string>();
  private readonly requiredFilesToEmitCache = new Map<string, EmitFileResult | undefined>();
  private readonly fileEmitHistory = new Map<string, FileEmitHistoryItem>();

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

  private get compilerCli(): typeof import('@angular/compiler-cli') {
    // The compilerCliModule field is guaranteed to be defined during a compilation
    // due to the `beforeCompile` hook. Usage of this property accessor prior to the
    // hook execution is an implementation error.
    assert.ok(this.compilerCliModule, `'@angular/compiler-cli' used prior to Webpack compilation.`);

    return this.compilerCliModule;
  }

  get options(): AngularWebpackPluginOptions {
    return this.pluginOptions;
  }

  // eslint-disable-next-line max-lines-per-function
  apply(compiler: Compiler): void {
    const { NormalModuleReplacementPlugin, util } = compiler.webpack;

    // Setup file replacements with webpack
    for (const [key, value] of Object.entries(this.pluginOptions.fileReplacements)) {
      new NormalModuleReplacementPlugin(
        new RegExp('^' + key.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&') + '$'),
        value,
      ).apply(compiler);
    }

    // Set resolver options
    const pathsPlugin = new TypeScriptPathsPlugin();
    compiler.hooks.afterResolvers.tap(PLUGIN_NAME, (compiler) => {
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

    // Load the compiler-cli if not already available
    compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, () => this.initializeCompilerCli());

    let ngccProcessor: NgccProcessor | undefined;
    let resourceLoader: WebpackResourceLoader | undefined;
    let previousUnused: Set<string> | undefined;
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      // Register plugin to ensure deterministic emit order in multi-plugin usage
      const emitRegistration = this.registerWithCompilation(compilation);
      this.watchMode = compiler.watchMode;

      // Initialize webpack cache
      if (!this.webpackCache && compilation.options.cache) {
        this.webpackCache = compilation.getCache(PLUGIN_NAME);
      }

      // Initialize the resource loader if not already setup
      if (!resourceLoader) {
        resourceLoader = new WebpackResourceLoader(this.watchMode);
      }

      // Initialize and process eager ngcc if not already setup
      if (!ngccProcessor) {
        const { processor, errors, warnings } = initializeNgccProcessor(
          compiler,
          this.pluginOptions.tsconfig,
          this.compilerNgccModule,
        );

        processor.process();
        warnings.forEach((warning) => addWarning(compilation, warning));
        errors.forEach((error) => addError(compilation, error));

        ngccProcessor = processor;
      }

      // Setup and read TypeScript and Angular compiler configuration
      const { compilerOptions, rootNames, errors } = this.loadConfiguration();

      // Create diagnostics reporter and report configuration file errors
      const diagnosticsReporter = createDiagnosticsReporter(compilation, (diagnostic) =>
        this.compilerCli.formatDiagnostics([diagnostic]),
      );
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

        // Ensure all program files are considered part of the compilation and will be watched.
        // Webpack does not normalize paths. Therefore, we need to normalize the path with FS seperators.
        compilation.fileDependencies.add(externalizePath(sourceFile.fileName));

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

  private registerWithCompilation(compilation: Compilation) {
    let fileEmitters = compilationFileEmitters.get(compilation);
    if (!fileEmitters) {
      fileEmitters = new FileEmitterCollection();
      compilationFileEmitters.set(compilation, fileEmitters);
      compilation.compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
        PLUGIN_NAME,
        (loaderContext: { [AngularPluginSymbol]?: FileEmitterCollection }) => {
          loaderContext[AngularPluginSymbol] = fileEmitters;
        },
      );
    }
    const emitRegistration = fileEmitters.register();

    return emitRegistration;
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
    compilation: Compilation,
    fileEmitter: FileEmitter,
  ): Promise<void> {
    if (this.requiredFilesToEmit.size === 0) {
      return;
    }

    const filesToRebuild = new Set<string>();
    for (const requiredFile of this.requiredFilesToEmit) {
      const history = await this.getFileEmitHistory(requiredFile);
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

  private loadConfiguration() {
    const {
      options: compilerOptions,
      rootNames,
      errors,
    } = this.compilerCli.readConfiguration(
      this.pluginOptions.tsconfig,
      this.pluginOptions.compilerOptions,
    );
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
    const angularProgram = new this.compilerCli.NgtscProgram(
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

    // Collect program level diagnostics
    const diagnostics = [
      ...angularCompiler.getOptionDiagnostics(),
      ...builder.getOptionsDiagnostics(),
      ...builder.getGlobalDiagnostics(),
    ];
    diagnosticsReporter(diagnostics);

    // Collect source file specific diagnostics
    for (const sourceFile of builder.getSourceFiles()) {
      if (!ignoreForDiagnostics.has(sourceFile)) {
        diagnosticsReporter(builder.getSyntacticDiagnostics(sourceFile));
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
    const pendingAnalysis = angularCompiler
      .analyzeAsync()
      .then(() => {
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
        const OptimizeFor = this.compilerCli.OptimizeFor;
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

        return {
          emitter: this.createFileEmitter(
            builder,
            mergeTransformers(angularCompiler.prepareEmit().transformers, transformers),
            getDependencies,
            (sourceFile) => {
              this.requiredFilesToEmit.delete(normalizePath(sourceFile.fileName));
              angularCompiler.incrementalDriver.recordSuccessfulEmit(sourceFile);
            },
          ),
        };
      })
      .catch((err) => ({ errorMessage: err instanceof Error ? err.message : `${err}` }));

    const analyzingFileEmitter: FileEmitter = async (file) => {
      const analysis = await pendingAnalysis;

      if ('errorMessage' in analysis) {
        throw new Error(analysis.errorMessage);
      }

      return analysis.emitter(file);
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

    const transformers = createJitTransformers(builder, this.compilerCli, this.pluginOptions);

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

      // Capture emit history info for Angular rebuild analysis
      const hash = content ? (await this.addFileEmitHistory(filePath, content)).hash : undefined;

      const dependencies = [
        ...(this.fileDependencies.get(filePath) || []),
        ...getExtraDependencies(sourceFile),
      ].map(externalizePath);

      return { content, map, dependencies, hash };
    };
  }

  private async initializeCompilerCli(): Promise<void> {
    if (this.compilerCliModule) {
      return;
    }

    // This uses a dynamic import to load `@angular/compiler-cli` which may be ESM.
    // CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
    // will currently, unconditionally downlevel dynamic import into a require call.
    // require calls cannot load ESM code and will result in a runtime error. To workaround
    // this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
    // Once TypeScript provides support for keeping the dynamic import this workaround can
    // be dropped.
    this.compilerCliModule = await new Function(`return import('@angular/compiler-cli');`)();
    this.compilerNgccModule = await new Function(`return import('@angular/compiler-cli/ngcc');`)();
  }

  private async addFileEmitHistory(
    filePath: string,
    content: string,
  ): Promise<FileEmitHistoryItem> {
    const historyData: FileEmitHistoryItem = {
      length: content.length,
      hash: createHash('md5').update(content).digest(),
    };

    if (this.webpackCache) {
      const history = await this.getFileEmitHistory(filePath);
      if (!history || Buffer.compare(history.hash, historyData.hash) !== 0) {
        // Hash doesn't match or item doesn't exist.
        await this.webpackCache.storePromise(filePath, null, historyData);
      }
    } else if (this.watchMode) {
      // The in memory file emit history is only required during watch mode.
      this.fileEmitHistory.set(filePath, historyData);
    }

    return historyData;
  }

  private async getFileEmitHistory(filePath: string): Promise<FileEmitHistoryItem | undefined> {
    return this.webpackCache
      ? this.webpackCache.getPromise<FileEmitHistoryItem | undefined>(filePath, null)
      : this.fileEmitHistory.get(filePath);
  }
}
