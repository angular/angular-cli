/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  CompilerHost,
  CompilerOptions,
  NgTscPlugin,
  readConfiguration,
} from '@angular/compiler-cli';
import * as path from 'path';
import * as ts from 'typescript';
import {
  Compiler,
  ContextReplacementPlugin,
  NormalModuleReplacementPlugin,
  compilation,
} from 'webpack';
import { NgccProcessor } from '../ngcc_processor';
import { TypeScriptPathsPlugin } from '../paths-plugin';
import { WebpackResourceLoader } from '../resource_loader';
import { forwardSlashPath } from '../utils';
import { addError, addWarning } from '../webpack-diagnostics';
import { DiagnosticsReporter, createDiagnosticsReporter } from './diagnostics';
import {
  augmentHostWithCaching,
  augmentHostWithNgcc,
  augmentHostWithReplacements,
  augmentHostWithResources,
  augmentHostWithSubstitutions,
  augmentHostWithVersioning,
} from './host';
import { AngularPluginSymbol, FileEmitter } from './symbol';
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
}

// Add support for missing properties in Webpack types as well as the loader's file emitter
interface WebpackCompilation extends compilation.Compilation {
  compilationDependencies: Set<string>;
  [AngularPluginSymbol]: FileEmitter;
}

function initializeNgccProcessor(
  compiler: Compiler,
  tsconfig: string,
): { processor: NgccProcessor; errors: string[]; warnings: string[] } {
  const { inputFileSystem, options: webpackOptions } = compiler;
  const mainFields = ([] as string[]).concat(...(webpackOptions.resolve?.mainFields || []));

  const fileWatchPurger = (path: string) => {
    if (inputFileSystem.purge) {
      // Webpack typings do not contain the string parameter overload for purge
      (inputFileSystem as { purge(path: string): void }).purge(path);
    }
  };

  const errors: string[] = [];
  const warnings: string[] = [];
  const processor = new NgccProcessor(
    mainFields,
    fileWatchPurger,
    warnings,
    errors,
    compiler.context,
    tsconfig,
  );

  return { processor, errors, warnings };
}

const PLUGIN_NAME = 'angular-compiler';

export class AngularWebpackPlugin {
  private readonly pluginOptions: AngularPluginOptions;
  private watchMode?: boolean;
  private ngtscNextProgram?: ts.Program;
  private builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private sourceFileCache?: Map<string, ts.SourceFile>;
  private buildTimestamp!: number;

  constructor(options: Partial<AngularPluginOptions> = {}) {
    this.pluginOptions = {
      emitClassMetadata: false,
      emitNgModuleScope: false,
      fileReplacements: {},
      substitutions: {},
      directTemplateLoading: true,
      tsconfig: 'tsconfig.json',
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

          return {
            ...resolveOptions,
            mainFields: [...ivyMainFields, ...originalMainFields],
          };
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
      const { options: compilerOptions, rootNames, errors } = readConfiguration(
        this.pluginOptions.tsconfig,
        this.pluginOptions.compilerOptions,
      );
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

      // Create diagnostics reporter and report configuration file errors
      const diagnosticsReporter = createDiagnosticsReporter(compilation);
      diagnosticsReporter(errors);

      // Update TypeScript path mapping plugin with new configuration
      pathsPlugin.update(compilerOptions);

      // Create a Webpack-based TypeScript compiler host
      const system = createWebpackSystem(
        compiler.inputFileSystem,
        forwardSlashPath(compiler.context),
      );
      const host = ts.createIncrementalCompilerHost(compilerOptions, system);

      // Setup source file caching and reuse cache from previous compilation if present
      let cache = this.sourceFileCache;
      if (cache) {
        // Invalidate existing cache based on compilation file timestamps
        for (const [file, time] of compilation.fileTimestamps) {
          if (this.buildTimestamp < time) {
            cache.delete(forwardSlashPath(file));
          }
        }
      } else {
        // Initialize a new cache
        cache = new Map();
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

      // Setup on demand ngcc
      augmentHostWithNgcc(host, ngccProcessor, moduleResolutionCache);

      // Setup resource loading
      resourceLoader.update(compilation);
      augmentHostWithResources(host, resourceLoader, {
        directTemplateLoading: this.pluginOptions.directTemplateLoading,
      });

      // Setup source file adjustment options
      augmentHostWithReplacements(host, this.pluginOptions.fileReplacements, moduleResolutionCache);
      augmentHostWithSubstitutions(host, this.pluginOptions.substitutions);

      // Create the file emitter used by the webpack loader
      const { fileEmitter, builder, internalFiles } = compilerOptions.skipTemplateCodegen
        ? this.updateJitProgram(compilerOptions, rootNames, host, diagnosticsReporter)
        : this.updateAotProgram(
            compilerOptions,
            rootNames,
            host,
            diagnosticsReporter,
            resourceLoader,
          );

      const allProgramFiles = builder
        .getSourceFiles()
        .filter((sourceFile) => !internalFiles || !internalFiles.has(sourceFile))
        .map((sourceFile) => sourceFile.fileName);

      // Ensure all program files are considered part of the compilation and will be watched
      allProgramFiles.forEach((sourceFile) => compilation.compilationDependencies.add(sourceFile));

      // Analyze program for unused files
      compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
        if (compilation.errors.length > 0) {
          return;
        }

        const currentUnused = new Set(
          allProgramFiles.filter((sourceFile) => !sourceFile.endsWith('.d.ts')),
        );
        modules.forEach((module) => {
          const { resource } = module as { resource?: string };
          const sourceFile = resource && builder.getSourceFile(forwardSlashPath(resource));
          if (!sourceFile) {
            return;
          }

          builder.getAllDependencies(sourceFile).forEach((dep) => currentUnused.delete(dep));
        });
        for (const unused of currentUnused) {
          if (previousUnused && previousUnused.has(unused)) {
            continue;
          }
          compilation.warnings.push(
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

  private updateAotProgram(
    compilerOptions: CompilerOptions,
    rootNames: string[],
    host: CompilerHost,
    diagnosticsReporter: DiagnosticsReporter,
    resourceLoader: WebpackResourceLoader,
  ) {
    // Create an ngtsc plugin instance used to initialize a TypeScript host and program
    const ngtsc = new NgTscPlugin(compilerOptions);

    const wrappedHost = ngtsc.wrapHost(host, rootNames, compilerOptions);

    // SourceFile versions are required for builder programs.
    // The wrapped host adds additional files that will not have versions
    augmentHostWithVersioning(wrappedHost);

    const oldProgram = this.ngtscNextProgram;
    const program = ts.createProgram({
      options: compilerOptions,
      oldProgram,
      rootNames: wrappedHost.inputFiles,
      host: wrappedHost,
    });

    // The `ignoreForEmit` return value can be safely ignored when emitting. Only files
    // that will be bundled (requested by Webpack) will be emitted. Combined with TypeScript's
    // eliding of type only imports, this will cause type only files to be automatically ignored.
    // Internal Angular type check files are also not resolvable by the bundler. Even if they
    // were somehow errantly imported, the bundler would error before an emit was attempted.
    // Diagnostics are still collected for all files which requires using `ignoreForDiagnostics`.
    const { ignoreForDiagnostics, ignoreForEmit } = ngtsc.setupCompilation(program, oldProgram);

    const builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      program,
      wrappedHost,
      this.builder,
    );

    // Save for next rebuild
    if (this.watchMode) {
      this.ngtscNextProgram = ngtsc.getNextProgram();
      this.builder = builder;
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
      ...ngtsc.getOptionDiagnostics(),
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
      // TODO: Integrate getModuleDependencies once implemented
      const dependencies = [];
      for (const resourceDependency of ngtsc.compiler.getResourceDependencies(sourceFile)) {
        const resourcePath = forwardSlashPath(resourceDependency);
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
    const pendingAnalysis = ngtsc.compiler.analyzeAsync().then(() => {
      // Collect Angular template diagnostics
      for (const sourceFile of builder.getSourceFiles()) {
        if (!ignoreForDiagnostics.has(sourceFile)) {
          diagnosticsReporter(ngtsc.getDiagnostics(sourceFile));
        }
      }

      return this.createFileEmitter(
        builder,
        mergeTransformers(ngtsc.createTransformers(), transformers),
        getDependencies,
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
  ): FileEmitter {
    return async (file: string) => {
      const sourceFile = program.getSourceFile(forwardSlashPath(file));
      if (!sourceFile) {
        return undefined;
      }

      let content: string | undefined = undefined;
      let map: string | undefined = undefined;
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

      const dependencies = [
        ...program.getAllDependencies(sourceFile),
        ...getExtraDependencies(sourceFile),
      ];

      return { content, map, dependencies };
    };
  }
}
