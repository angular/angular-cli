/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompilerHost, CompilerOptions, readConfiguration } from '@angular/compiler-cli';
import { NgtscProgram } from '@angular/compiler-cli/src/ngtsc/program';
import { createHash } from 'crypto';
import * as path from 'path';
import * as ts from 'typescript';
import {
  Compiler,
  ContextReplacementPlugin,
  NormalModuleReplacementPlugin,
  compilation,
} from 'webpack';
import { findLazyRoutes } from '../lazy_routes';
import { NgccProcessor } from '../ngcc_processor';
import { TypeScriptPathsPlugin } from '../paths-plugin';
import { WebpackResourceLoader } from '../resource_loader';
import { addError, addWarning } from '../webpack-diagnostics';
import { isWebpackFiveOrHigher, mergeResolverMainFields } from '../webpack-version';
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
import { AngularPluginSymbol, EmitFileResult, FileEmitter } from './symbol';
import { createWebpackSystem } from './system';
import { createAotTransformers, createJitTransformers, mergeTransformers } from './transformation';

export interface AngularPluginOptions {
  tsconfig: string;
  compilerOptions?: CompilerOptions;
  fileReplacements: Record<string, string>;
  substitutions: Record<string, string>;
  directTemplateLoading: boolean;
  emitClassMetadata: boolean;
  emitNgModuleScope: boolean;
  suppressZoneJsIncompatibilityWarning: boolean;
  jitMode: boolean;
}

// Add support for missing properties in Webpack types as well as the loader's file emitter
interface WebpackCompilation extends compilation.Compilation {
  compilationDependencies: Set<string>;
  rebuildModule(module: compilation.Module, callback: () => void): void;
  [AngularPluginSymbol]: FileEmitter;
}

function initializeNgccProcessor(
  compiler: Compiler,
  tsconfig: string,
): { processor: NgccProcessor; errors: string[]; warnings: string[] } {
  const { inputFileSystem, options: webpackOptions } = compiler;
  const mainFields = ([] as string[]).concat(...(webpackOptions.resolve?.mainFields || []));

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
  private readonly pluginOptions: AngularPluginOptions;
  private watchMode?: boolean;
  private ngtscNextProgram?: NgtscProgram;
  private builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private sourceFileCache?: SourceFileCache;
  private buildTimestamp!: number;
  private readonly lazyRouteMap: Record<string, string> = {};
  private readonly fileDependencies = new Map<string, Set<string>>();
  private readonly requiredFilesToEmit = new Set<string>();
  private readonly requiredFilesToEmitCache = new Map<string, EmitFileResult | undefined>();
  private readonly fileEmitHistory = new Map<string, { length: number; hash: Uint8Array }>();

  constructor(options: Partial<AngularPluginOptions> = {}) {
    this.pluginOptions = {
      emitClassMetadata: false,
      emitNgModuleScope: false,
      jitMode: false,
      fileReplacements: {},
      substitutions: {},
      directTemplateLoading: true,
      tsconfig: 'tsconfig.json',
      suppressZoneJsIncompatibilityWarning: false,
      ...options,
    };
  }

  get options(): AngularPluginOptions {
    return this.pluginOptions;
  }

  apply(compiler: Compiler & { watchMode?: boolean }): void {
    // Setup file replacements with webpack
    for (const [key, value] of Object.entries(this.pluginOptions.fileReplacements)) {
      new NormalModuleReplacementPlugin(
        new RegExp('^' + key.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&') + '$'),
        value,
      ).apply(compiler);
    }

    // Mimic VE plugin's systemjs module loader resource location for consistency
    new ContextReplacementPlugin(
      /\@angular[\\\/]core[\\\/]/,
      path.join(compiler.context, '$$_lazy_route_resource'),
      this.lazyRouteMap,
    ).apply(compiler);

    // Set resolver options
    const pathsPlugin = new TypeScriptPathsPlugin();
    compiler.hooks.afterResolvers.tap('angular-compiler', (compiler) => {
      // 'resolverFactory' is not present in the Webpack typings
      // tslint:disable-next-line: no-any
      const resolverFactoryHooks = (compiler as any).resolverFactory.hooks;

      // When Ivy is enabled we need to add the fields added by NGCC
      // to take precedence over the provided mainFields.
      // NGCC adds fields in package.json suffixed with '_ivy_ngcc'
      // Example: module -> module__ivy_ngcc
      resolverFactoryHooks.resolveOptions
        .for('normal')
        .tap(PLUGIN_NAME, (resolveOptions: { mainFields: string[] }) => {
          const originalMainFields = resolveOptions.mainFields;
          const ivyMainFields = originalMainFields.map((f) => `${f}_ivy_ngcc`);

          return mergeResolverMainFields(resolveOptions, originalMainFields, ivyMainFields);
        });

      resolverFactoryHooks.resolver.for('normal').tap(PLUGIN_NAME, (resolver: {}) => {
        pathsPlugin.apply(resolver);
      });
    });

    let ngccProcessor: NgccProcessor | undefined;
    const resourceLoader = new WebpackResourceLoader();
    let previousUnused: Set<string> | undefined;
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (thisCompilation) => {
      const compilation = thisCompilation as WebpackCompilation;

      // Store watch mode; assume true if not present (webpack < 4.23.0)
      this.watchMode = compiler.watchMode ?? true;

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
      const system = createWebpackSystem(compiler.inputFileSystem, normalizePath(compiler.context));
      const host = ts.createIncrementalCompilerHost(compilerOptions, system);

      // Setup source file caching and reuse cache from previous compilation if present
      let cache = this.sourceFileCache;
      let changedFiles;
      if (cache) {
        // Invalidate existing cache based on compiler file timestamps
        changedFiles = cache.invalidate(compiler.fileTimestamps, this.buildTimestamp);

        // Invalidate file dependencies of changed files
        for (const changedFile of changedFiles) {
          this.fileDependencies.delete(normalizePath(changedFile));
        }
      } else {
        // Initialize a new cache
        cache = new SourceFileCache();
        // Only store cache if in watch mode
        if (this.watchMode) {
          this.sourceFileCache = cache;
        }
      }
      this.buildTimestamp = Date.now();
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
      });

      // Setup source file adjustment options
      augmentHostWithReplacements(host, this.pluginOptions.fileReplacements, moduleResolutionCache);
      augmentHostWithSubstitutions(host, this.pluginOptions.substitutions);

      // Create the file emitter used by the webpack loader
      const { fileEmitter, builder, internalFiles } = this.pluginOptions.jitMode
        ? this.updateJitProgram(compilerOptions, rootNames, host, diagnosticsReporter, changedFiles)
        : this.updateAotProgram(
            compilerOptions,
            rootNames,
            host,
            diagnosticsReporter,
            resourceLoader,
          );

      const allProgramFiles = builder
        .getSourceFiles()
        .filter((sourceFile) => !internalFiles?.has(sourceFile));

      // Ensure all program files are considered part of the compilation and will be watched
      if (isWebpackFiveOrHigher()) {
        allProgramFiles.forEach((sourceFile) =>
          compilation.fileDependencies.add(sourceFile.fileName),
        );
      } else {
        allProgramFiles.forEach((sourceFile) =>
          compilation.compilationDependencies.add(sourceFile.fileName),
        );
      }

      compilation.hooks.finishModules.tapPromise(PLUGIN_NAME, async (modules) => {
        // Rebuild any remaining AOT required modules
        await this.rebuildRequiredFiles(modules, compilation, fileEmitter);

        // Analyze program for unused files
        if (compilation.errors.length > 0) {
          return;
        }

        const currentUnused = new Set(
          allProgramFiles
            .filter((sourceFile) => !sourceFile.isDeclarationFile)
            .map((sourceFile) => sourceFile.fileName),
        );
        modules.forEach(({ resource }: compilation.Module & { resource?: string }) => {
          const sourceFile = resource && builder.getSourceFile(resource);
          if (!sourceFile) {
            return;
          }

          builder.getAllDependencies(sourceFile).forEach((dep) => currentUnused.delete(dep));
        });
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
      compilation[AngularPluginSymbol] = fileEmitter;
    });
  }

  private async rebuildRequiredFiles(
    modules: Iterable<compilation.Module>,
    compilation: WebpackCompilation,
    fileEmitter: FileEmitter,
  ): Promise<void> {
    if (this.requiredFilesToEmit.size === 0) {
      return;
    }

    const rebuild = (webpackModule: compilation.Module) =>
      new Promise<void>((resolve) => compilation.rebuildModule(webpackModule, resolve));

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
      for (const webpackModule of [...modules]) {
        const resource = (webpackModule as compilation.Module & { resource?: string }).resource;
        if (resource && filesToRebuild.has(normalizePath(resource))) {
          await rebuild(webpackModule);
        }
      }
    }

    this.requiredFilesToEmit.clear();
    this.requiredFilesToEmitCache.clear();
  }

  private loadConfiguration(compilation: WebpackCompilation) {
    const { options: compilerOptions, rootNames, errors } = readConfiguration(
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

    if (
      !this.pluginOptions.suppressZoneJsIncompatibilityWarning &&
      compilerOptions.target &&
      compilerOptions.target >= ts.ScriptTarget.ES2017
    ) {
      addWarning(
        compilation,
        'Zone.js does not support native async/await in ES2017+.\n' +
          'These blocks are not intercepted by zone.js and will not triggering change detection.\n' +
          'See: https://github.com/angular/zone.js/pull/1140 for more information.',
      );
    }

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

    const builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      typeScriptProgram,
      host,
      this.builder,
    );

    // Save for next rebuild
    if (this.watchMode) {
      this.builder = builder;
      this.ngtscNextProgram = angularProgram;
    }

    // Update semantic diagnostics cache
    while (true) {
      const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) =>
        ignoreForDiagnostics.has(sourceFile),
      );
      if (!result) {
        break;
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
        // Collect Angular template diagnostics
        if (!ignoreForDiagnostics.has(sourceFile)) {
          // The below check should be removed once support for compiler 11.0 is dropped.
          // Also, the below require should be changed to an ES6 import.
          if (angularCompiler.getDiagnosticsForFile) {
            // @angular/compiler-cli 11.1+
            const { OptimizeFor } = require('@angular/compiler-cli/src/ngtsc/typecheck/api');
            diagnosticsReporter(
              angularCompiler.getDiagnosticsForFile(sourceFile, OptimizeFor.WholeProgram),
            );
          } else {
            // @angular/compiler-cli 11.0+
            const getDiagnostics = angularCompiler.getDiagnostics as (
              sourceFile: ts.SourceFile,
            ) => ts.Diagnostic[];
            diagnosticsReporter(getDiagnostics.call(angularCompiler, sourceFile));
          }
        }

        // Collect sources that are required to be emitted
        if (
          !sourceFile.isDeclarationFile &&
          !ignoreForEmit.has(sourceFile) &&
          !angularCompiler.incrementalDriver.safeToSkipEmit(sourceFile)
        ) {
          this.requiredFilesToEmit.add(normalizePath(sourceFile.fileName));
        }
      }

      // NOTE: This can be removed once support for the deprecated lazy route string format is removed
      for (const lazyRoute of angularCompiler.listLazyRoutes()) {
        const [routeKey] = lazyRoute.route.split('#');
        this.lazyRouteMap[routeKey] = lazyRoute.referencedModule.filePath;
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
    changedFiles: Set<string> | undefined,
  ) {
    const builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      rootNames,
      compilerOptions,
      host,
      this.builder,
    );

    // Save for next rebuild
    if (this.watchMode) {
      this.builder = builder;
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

    // Only do a full, expensive Angular compiler string lazy route analysis on the first build
    // `changedFiles` will be undefined on a first build
    if (!changedFiles) {
      // Required to support asynchronous resource loading
      // Must be done before listing lazy routes
      // NOTE: This can be removed once support for the deprecated lazy route string format is removed
      const angularProgram = new NgtscProgram(
        rootNames,
        compilerOptions,
        host,
      );
      const angularCompiler = angularProgram.compiler;
      const pendingAnalysis = angularCompiler.analyzeAsync().then(() => {
        for (const lazyRoute of angularCompiler.listLazyRoutes()) {
          const [routeKey] = lazyRoute.route.split('#');
          this.lazyRouteMap[routeKey] = lazyRoute.referencedModule.filePath;
        }

        return this.createFileEmitter(builder, transformers, () => []);
      });
      const analyzingFileEmitter: FileEmitter = async (file) => {
        const innerFileEmitter = await pendingAnalysis;

        return innerFileEmitter(file);
      };

      return {
        fileEmitter: analyzingFileEmitter,
        builder,
        internalFiles: undefined,
      };
    } else {
      // Update lazy route map for changed files using fast but less accurate method
      for (const changedFile of changedFiles) {
        if (!builder.getSourceFile(changedFile)) {
          continue;
        }

        const routes = findLazyRoutes(changedFile, host, builder.getProgram());
        for (const [routeKey, filePath] of Object.entries(routes)) {
          this.lazyRouteMap[routeKey] = filePath;
        }
      }

      return {
        fileEmitter: this.createFileEmitter(builder, transformers, () => []),
        builder,
        internalFiles: undefined,
      };
    }
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
        ...this.fileDependencies.get(filePath) || [],
        ...getExtraDependencies(sourceFile),
      ].map(externalizePath);

      return { content, map, dependencies, hash };
    };
  }
}
