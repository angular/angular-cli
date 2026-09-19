/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import assert from 'node:assert';
import path from 'node:path';
import ts from 'typescript';
import { toPosixPath } from '../../../utils/path';
import { profileAsync, profileSync } from '../../esbuild/profiling';
import {
  type AngularCompilerHost,
  type AngularHostOptions,
  createAngularCompilerHost,
  ensureSourceFileVersions,
} from '../angular-host';
import {
  type AngularCompilationResult,
  DiagnosticModes,
  type EmitFileResult,
} from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { TypeScriptCompilation } from './typescript-compilation';

/**
 * Options for configuring a library compilation.
 */
export interface LibraryCompilationOptions {
  entryFilePath: string;
  compilationMode?: 'partial' | 'full';
  declarationMap?: boolean;

  /** Map of entry point module specifiers to target .d.ts paths for compilerOptions.paths. */
  upstreamDtsPaths?: Record<string, string[]>;

  /** Map of .d.ts file paths to in-memory contents for compiler host resolution. */
  upstreamDtsFiles?: Map<string, string>;
  basePath?: string;
  rootDir?: string;
  tsBuildInfoFile?: string;
  sourceFileCache?: Map<string, ts.SourceFile>;
}

class LibraryCompilationState {
  constructor(
    public readonly angularProgram: ng.NgtscProgram,
    public readonly compilerHost: AngularCompilerHost,
    public readonly typeScriptProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    public readonly configurationDiagnostics: readonly ts.Diagnostic[],
    public readonly affectedFiles: ReadonlySet<ts.SourceFile>,
    public readonly optimizeFor: ng.OptimizeFor,
    public readonly diagnosticCache = new WeakMap<ts.SourceFile, readonly ts.Diagnostic[]>(),
  ) {}

  get angularCompiler() {
    return this.angularProgram.compiler;
  }
}

/**
 * An Angular compilation implementation specifically tailored for library building
 * according to the Angular Package Format (APF). Supports partial/full compilation modes,
 * in-memory declaration emitting, upstream entry point path mapping, and incremental builds.
 */
export class LibraryCompilation extends TypeScriptCompilation {
  #state?: LibraryCompilationState;
  #cachedConfig?: {
    compilerOptions: ng.CompilerOptions;
    parsedRootNames: string[];
    configurationDiagnostics: readonly ts.Diagnostic[];
  };

  constructor(private readonly libraryOptions: LibraryCompilationOptions) {
    super(libraryOptions.sourceFileCache);
  }

  updateLibraryOptions(options: Partial<LibraryCompilationOptions>): void {
    Object.assign(this.libraryOptions, options);
  }

  #loadConfiguration(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides: CompilerOptionOverrides | undefined,
    readConfiguration: (project: string, options?: ng.CompilerOptions) => ng.ParsedConfiguration,
  ) {
    const shouldReloadConfig =
      !this.#cachedConfig || hostOptions.modifiedFiles?.has(toPosixPath(tsconfig));

    if (shouldReloadConfig) {
      const {
        compilationMode = 'partial',
        declarationMap = false,
        basePath,
        rootDir,
        tsBuildInfoFile,
      } = this.libraryOptions;

      const {
        options: rawCompilerOptions,
        rootNames: parsedRootNames,
        errors: configurationDiagnostics,
      } = profileSync('NG_READ_CONFIG', () =>
        readConfiguration(tsconfig, {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          importHelpers: true,
          composite: false,
          sourceMap: true,
          inlineSources: true,
          inlineSourceMap: false,
          outDir: '',
          declaration: true,
          declarationMap,
          allowEmptyCodegenFiles: false,
          annotationsAs: 'decorators',
          enableResourceInlining: true,
          noEmitOnError: false,
          suppressOutputPathCheck: true,
          compilationMode,
          basePath,
          rootDir,
          tsBuildInfoFile,
          preserveSymlinks: compilerOptionOverrides?.preserveSymlinks,
          // Disable removing of comments as TS is quite aggressive with these and can
          // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
          removeComments: false,
        }),
      );

      this.#cachedConfig = {
        compilerOptions: rawCompilerOptions,
        parsedRootNames,
        configurationDiagnostics,
      };
    }

    assert(this.#cachedConfig);

    return this.#cachedConfig;
  }

  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides?: CompilerOptionOverrides,
  ): Promise<AngularCompilationResult> {
    const { NgtscProgram, OptimizeFor, readConfiguration } =
      await TypeScriptCompilation.loadCompilerCli();

    const { upstreamDtsPaths, upstreamDtsFiles, entryFilePath, tsBuildInfoFile } =
      this.libraryOptions;

    const {
      compilerOptions: rawCompilerOptions,
      parsedRootNames,
      configurationDiagnostics,
    } = this.#loadConfiguration(tsconfig, hostOptions, compilerOptionOverrides, readConfiguration);

    const compilerOptions = { ...rawCompilerOptions };

    if (upstreamDtsPaths) {
      compilerOptions.paths = {
        ...compilerOptions.paths,
        ...upstreamDtsPaths,
      };
    }

    if (tsBuildInfoFile) {
      compilerOptions.incremental = true;
      compilerOptions.tsBuildInfoFile = tsBuildInfoFile;
    } else if (compilerOptionOverrides?.cachePath && compilerOptions.incremental !== false) {
      const safeEntryName = toPosixPath(entryFilePath)
        .replace(/[:\\/]/g, '_')
        .replace(/\.[^.]+$/, '');
      compilerOptions.incremental = true;
      compilerOptions.tsBuildInfoFile = path.join(
        compilerOptionOverrides.cachePath,
        'tsbuildinfo',
        `${safeEntryName}.tsbuildinfo`,
      );
    } else {
      compilerOptions.incremental = false;
    }

    const packageJsonCache = this.#state?.compilerHost
      .getModuleResolutionCache?.()
      ?.getPackageJsonInfoCache();

    if (hostOptions.modifiedFiles) {
      this.invalidateFiles(hostOptions.modifiedFiles);
    }

    const host = createAngularCompilerHost(
      ts,
      compilerOptions,
      hostOptions,
      packageJsonCache,
      this.sourceFiles,
    );

    if (upstreamDtsFiles && upstreamDtsFiles.size > 0) {
      const originalFileExists = host.fileExists.bind(host);
      host.fileExists = (fileName: string) => {
        if (upstreamDtsFiles.has(toPosixPath(fileName))) {
          return true;
        }

        return originalFileExists(fileName);
      };

      const originalReadFile = host.readFile.bind(host);
      host.readFile = (fileName: string) => {
        const content = upstreamDtsFiles.get(toPosixPath(fileName));
        if (content !== undefined) {
          return content;
        }

        return originalReadFile(fileName);
      };

      if (host.realpath) {
        const originalRealpath = host.realpath.bind(host);
        host.realpath = (fileName: string) => {
          if (upstreamDtsFiles.has(toPosixPath(fileName))) {
            return fileName;
          }

          return originalRealpath(fileName);
        };
      }
    }

    const rootNames = [
      entryFilePath,
      ...parsedRootNames.filter((file) => /\.d\.[cm]?ts$/i.test(file)),
    ];

    const angularProgram = profileSync(
      'NG_CREATE_PROGRAM',
      () => new NgtscProgram(rootNames, compilerOptions, host, this.#state?.angularProgram),
    );
    const angularCompiler = angularProgram.compiler;
    const angularTypeScriptProgram = angularProgram.getTsProgram();
    ensureSourceFileVersions(angularTypeScriptProgram);

    let oldProgram = this.#state?.typeScriptProgram;
    if (!oldProgram && compilerOptions.tsBuildInfoFile) {
      oldProgram = ts.readBuilderProgram(compilerOptions, host);
    }

    const typeScriptProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      angularTypeScriptProgram,
      host,
      oldProgram,
      configurationDiagnostics.length ? configurationDiagnostics : undefined,
    );

    await profileAsync('NG_ANALYZE_PROGRAM', () => angularCompiler.analyzeAsync());

    const affectedFiles = new Set<ts.SourceFile>();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = typeScriptProgram.getSemanticDiagnosticsOfNextAffectedFile(
        undefined,
        (sourceFile) => {
          if (
            angularCompiler.ignoreForDiagnostics.has(sourceFile) &&
            sourceFile.fileName.endsWith('.ngtypecheck.ts')
          ) {
            const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
            const originalSourceFile = typeScriptProgram.getSourceFile(originalFilename);
            if (originalSourceFile) {
              affectedFiles.add(originalSourceFile);
            }

            return true;
          }

          return false;
        },
      );
      if (!result) {
        break;
      }
      if (result.affected && 'fileName' in result.affected) {
        affectedFiles.add(result.affected);
      }
    }

    const diagnosticCache =
      this.#state?.diagnosticCache ?? new WeakMap<ts.SourceFile, readonly ts.Diagnostic[]>();

    const referencedFiles: string[] = [];
    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForEmit.has(sourceFile) || sourceFile.isDeclarationFile) {
        continue;
      }

      referencedFiles.push(sourceFile.fileName);
      const resourceDependencies = angularCompiler.getResourceDependencies(sourceFile);
      if (resourceDependencies.length > 0) {
        referencedFiles.push(...resourceDependencies);
        if (this.#state && hostOptions.modifiedFiles?.size) {
          for (const resourceDependency of resourceDependencies) {
            if (hostOptions.modifiedFiles.has(resourceDependency)) {
              diagnosticCache.delete(sourceFile);
              affectedFiles.add(sourceFile);
            }
          }
        }
      }
    }

    const optimizeFor =
      affectedFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram;

    this.#state = new LibraryCompilationState(
      angularProgram,
      host,
      typeScriptProgram,
      configurationDiagnostics,
      affectedFiles,
      optimizeFor,
      diagnosticCache,
    );

    return {
      compilerOptions,
      referencedFiles,
    };
  }

  protected override *collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic> {
    assert(this.#state, 'Library compilation must be initialized prior to collecting diagnostics.');
    const {
      angularProgram,
      typeScriptProgram,
      configurationDiagnostics,
      affectedFiles,
      optimizeFor,
      diagnosticCache,
    } = this.#state;
    const angularCompiler = angularProgram.compiler;

    const syntactic = modes & DiagnosticModes.Syntactic;
    const semantic = modes & DiagnosticModes.Semantic;

    if (modes & DiagnosticModes.Option) {
      yield* configurationDiagnostics;
      yield* angularCompiler.getOptionDiagnostics();
      yield* typeScriptProgram.getOptionsDiagnostics();
      yield* typeScriptProgram.getConfigFileParsingDiagnostics();
    }

    if (syntactic) {
      yield* typeScriptProgram.getGlobalDiagnostics();
    }

    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      if (syntactic) {
        yield* typeScriptProgram.getSyntacticDiagnostics(sourceFile);
      }

      if (!semantic) {
        continue;
      }

      yield* typeScriptProgram.getSemanticDiagnostics(sourceFile);

      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (affectedFiles.has(sourceFile)) {
        const diagnostics = angularCompiler.getDiagnosticsForFile(sourceFile, optimizeFor);
        diagnosticCache.set(sourceFile, diagnostics);
        yield* diagnostics;
      } else {
        const cachedDiagnostics = diagnosticCache.get(sourceFile);
        if (cachedDiagnostics) {
          yield* cachedDiagnostics;
        }
      }
    }
  }

  override emitAffectedFiles(): Iterable<EmitFileResult> {
    assert(this.#state, 'Library compilation must be initialized prior to emitting files.');
    const { angularProgram, compilerHost, typeScriptProgram } = this.#state;
    const angularCompiler = angularProgram.compiler;
    const compilerOptions = typeScriptProgram.getCompilerOptions();
    const buildInfoFilename = compilerOptions.tsBuildInfoFile ?? '.tsbuildinfo';

    const emittedFiles: EmitFileResult[] = [];
    const writeFileCallback: ts.WriteFileCallback = (filename, contents, _a, _b, sourceFiles) => {
      if (
        !sourceFiles?.length &&
        (filename.endsWith('.tsbuildinfo') || filename.endsWith(buildInfoFilename))
      ) {
        compilerHost.writeFile(filename, contents, false);

        return;
      }

      emittedFiles.push({ filename, contents });
    };

    const transformers = angularCompiler.prepareEmit().transformers;

    for (const sourceFile of typeScriptProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }

      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (
        angularCompiler.incrementalCompilation?.safeToSkipEmit(sourceFile) &&
        !this.#state.affectedFiles.has(sourceFile)
      ) {
        continue;
      }

      typeScriptProgram.emit(sourceFile, writeFileCallback, undefined, undefined, transformers);
      angularCompiler.incrementalCompilation?.recordSuccessfulEmit(sourceFile);
    }

    if (compilerOptions.tsBuildInfoFile) {
      const programWithGetState = typeScriptProgram.getProgram() as ts.Program & {
        emitBuildInfo?(writeFileCallback?: ts.WriteFileCallback): void;
      };
      if (typeof programWithGetState.emitBuildInfo === 'function') {
        programWithGetState.emitBuildInfo(writeFileCallback);
      }
    }

    return emittedFiles;
  }
}
