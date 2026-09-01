/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  BuildContext,
  BuildFailure,
  BuildOptions,
  BuildResult,
  Message,
  Metafile,
  build,
  context,
} from 'esbuild';
import assert from 'node:assert';
import { basename, extname, isAbsolute, join, normalize, relative } from 'node:path';
import { SERVER_GENERATED_EXTERNALS } from '../../utils/server-rendering/manifest';
import {
  type BuildOutputFile,
  BuildOutputFileType,
  type InitialFileRecord,
  convertOutputFile,
} from './bundler-files';
import { LoadResultCache, MemoryLoadResultCache } from './load-result-cache';

export type BundleContextResult =
  | { errors: Message[]; warnings: Message[] }
  | {
      errors: undefined;
      warnings: Message[];
      metafile: Metafile;
      platform: 'browser' | 'server';
      outputFiles: BuildOutputFile[];
      initialFiles: Map<string, InitialFileRecord>;
      externalImports: Set<string>;
      externalConfiguration?: string[];
    };

export type BundleMergedContextResult =
  | { errors: Message[]; warnings: Message[] }
  | {
      errors: undefined;
      warnings: Message[];
      metafiles: {
        browser: Metafile;
        server: Metafile;
      };
      outputFiles: BuildOutputFile[];
      initialFiles: Map<string, InitialFileRecord>;
      externalImports: {
        server: Set<string>;
        browser: Set<string>;
      };
      externalConfiguration?: string[];
    };

export type BundlerOptionsFactory<T extends BuildOptions = BuildOptions> = (
  loadCache: LoadResultCache | undefined,
) => T;

/**
 * Determines if an unknown value is an esbuild BuildFailure error object thrown by esbuild.
 * @param value A potential esbuild BuildFailure error object.
 * @returns `true` if the object is determined to be a BuildFailure object; otherwise, `false`.
 */
function isEsBuildFailure(value: unknown): value is BuildFailure {
  return !!value && typeof value === 'object' && 'errors' in value && 'warnings' in value;
}

export class BundlerContext {
  #esbuildContext?: BuildContext<{ metafile: true; write: false }>;
  #esbuildOptions?: BuildOptions & { metafile: true; write: false };
  #esbuildResult?: BundleContextResult;
  #activeBundlePromise?: Promise<BundleContextResult>;
  #disposed = false;
  #optionsFactory: BundlerOptionsFactory<BuildOptions & { metafile: true; write: false }>;
  #shouldCacheResult: boolean;
  #loadCache?: LoadResultCache;
  #invalidationEpoch = 0;
  readonly watchFiles = new Set<string>();

  constructor(
    private workspaceRoot: string,
    private incremental: boolean,
    options: BuildOptions | BundlerOptionsFactory,
    private useContext = incremental,
    private initialFilter?: (initial: Readonly<InitialFileRecord>) => boolean,
    sharedLoadCache?: LoadResultCache,
  ) {
    this.#loadCache = sharedLoadCache;
    // To cache the results an option factory is needed to capture the full set of dependencies
    this.#shouldCacheResult = incremental && typeof options === 'function';
    this.#optionsFactory = (...args) => {
      const baseOptions = typeof options === 'function' ? options(...args) : options;

      return {
        ...baseOptions,
        metafile: true,
        write: false,
      };
    };
  }

  static bundleAll(
    contexts: Iterable<BundlerContext>,
    changedFiles?: Iterable<string> | ReadonlySet<string>,
  ): Promise<BundleContextResult[]> {
    return Promise.all(
      [...contexts].map((context) => {
        if (changedFiles) {
          context.invalidate(changedFiles);
        }

        return context.bundle();
      }),
    );
  }

  static mergeResults(results: BundleContextResult[]): BundleMergedContextResult {
    let errors: Message[] | undefined;
    const warnings: Message[] = [];
    const browserMetafile: Metafile = { inputs: {}, outputs: {} };
    const serverMetafile: Metafile = { inputs: {}, outputs: {} };
    const initialFiles = new Map<string, InitialFileRecord>();
    const externalImportsBrowser = new Set<string>();
    const externalImportsServer = new Set<string>();

    const outputFiles: BuildOutputFile[] = [];
    let externalConfiguration: Set<string> | undefined;
    for (const result of results) {
      warnings.push(...result.warnings);
      if (result.errors) {
        errors ??= [];
        errors.push(...result.errors);
        continue;
      }

      const platformIsBrowser = result.platform === 'browser';

      // Combine metafiles used for the bundle budgets and console output
      if (result.metafile) {
        const metafile = platformIsBrowser ? browserMetafile : serverMetafile;
        Object.assign(metafile.inputs, result.metafile.inputs);
        Object.assign(metafile.outputs, result.metafile.outputs);
      }

      const externalImports = platformIsBrowser ? externalImportsBrowser : externalImportsServer;
      result.externalImports?.forEach((value) => externalImports.add(value));

      result.initialFiles.forEach((value, key) => initialFiles.set(key, value));
      outputFiles.push(...result.outputFiles);

      if (result.externalConfiguration) {
        externalConfiguration ??= new Set<string>();
        for (const value of result.externalConfiguration) {
          externalConfiguration.add(value);
        }
      }
    }

    if (errors !== undefined) {
      return { errors, warnings };
    }

    return {
      errors,
      warnings,
      initialFiles,
      outputFiles,
      externalImports: {
        browser: externalImportsBrowser,
        server: externalImportsServer,
      },
      metafiles: {
        browser: browserMetafile,
        server: serverMetafile,
      },
      externalConfiguration: externalConfiguration ? [...externalConfiguration] : undefined,
    };
  }

  /**
   * Executes the esbuild build function and normalizes the build result in the event of a
   * build failure that results in no output being generated.
   * All builds use the `write` option with a value of `false` to allow for the output files
   * build result array to be populated.
   *
   * @param force If true, always rebundle.
   * @returns If output files are generated, the full esbuild BuildResult; if not, the
   * warnings and errors for the attempted build.
   */
  async bundle(force?: boolean): Promise<BundleContextResult> {
    // Return existing result if present
    if (!force && this.#esbuildResult) {
      return this.#esbuildResult;
    }

    if (!force && this.#activeBundlePromise) {
      return this.#activeBundlePromise;
    }

    const bundleEpoch = this.#invalidationEpoch;
    const bundlePromise = this.#performBundle().finally(() => {
      if (this.#activeBundlePromise === bundlePromise) {
        this.#activeBundlePromise = undefined;
      }
    });
    this.#activeBundlePromise = bundlePromise;

    const result = await bundlePromise;
    if (this.#shouldCacheResult && bundleEpoch === this.#invalidationEpoch) {
      this.#esbuildResult = result;
    }

    return result;
  }

  // eslint-disable-next-line max-lines-per-function
  async #performBundle(): Promise<BundleContextResult> {
    // Create esbuild options if not present
    if (this.#esbuildOptions === undefined) {
      if (this.incremental && !this.#loadCache) {
        this.#loadCache = new MemoryLoadResultCache();
      }
      this.#esbuildOptions = this.#optionsFactory(this.#loadCache);
    }

    if (this.incremental) {
      this.watchFiles.clear();
    }

    let result: BuildResult<{ metafile: true; write: false }>;
    try {
      if (this.#esbuildContext) {
        // Rebuild using the existing incremental build context
        result = await this.#esbuildContext.rebuild();
      } else if (this.useContext) {
        // Create a build context and perform the build.
        // Context creation does not perform a build.
        const esbuildContext = await context(this.#esbuildOptions);
        if (this.#disposed) {
          await esbuildContext.dispose();
          throw new Error('BundlerContext was disposed during build.');
        }
        this.#esbuildContext = esbuildContext;
        result = await this.#esbuildContext.rebuild();
      } else {
        // For non-incremental builds, perform a single build
        if (this.#disposed) {
          throw new Error('BundlerContext was disposed during build.');
        }
        result = await build(this.#esbuildOptions);
        if (this.#disposed) {
          throw new Error('BundlerContext was disposed during build.');
        }
      }
    } catch (failure) {
      // Build failures will throw an exception which contains errors/warnings
      if (isEsBuildFailure(failure)) {
        this.#addErrorsToWatch(failure);
        this.#addLoadCacheFilesToWatch();

        return failure;
      } else {
        throw failure;
      }
    }

    // Update files that should be watched.
    // While this should technically not be linked to incremental mode, incremental is only
    // currently enabled with watch mode where watch files are needed.
    if (this.incremental) {
      // Add input files except virtual angular files which do not exist on disk
      for (const input of Object.keys(result.metafile.inputs)) {
        const isInternal = isInternalAngularFile(input) || isInternalBundlerFile(input);

        // Input file paths are always relative to the workspace root unless already absolute
        const normalizedAbsoluteInput = isAbsolute(input)
          ? normalize(input)
          : join(this.workspaceRoot, input);

        if (!isInternal) {
          this.watchFiles.add(normalizedAbsoluteInput);
        }

        if (this.#loadCache) {
          const cachedLoad =
            (await this.#loadCache.get(input)) ??
            (await this.#loadCache.get(input.replace(';', ':'))) ??
            (await this.#loadCache.get('file:' + normalizedAbsoluteInput));
          if (cachedLoad?.watchFiles) {
            for (const file of cachedLoad.watchFiles) {
              if (!isInternalAngularFile(file)) {
                this.watchFiles.add(
                  isAbsolute(file) ? normalize(file) : join(this.workspaceRoot, file),
                );
              }
            }
          }
        }
      }
    }

    // Return if the build encountered any errors
    if (result.errors.length) {
      this.#addErrorsToWatch(result);
      this.#addLoadCacheFilesToWatch();

      return {
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    const {
      'ng-platform-server': isPlatformServer = false,
      'ng-ssr-entry-bundle': isSsrEntryBundle = false,
    } = result.metafile as Metafile & {
      'ng-platform-server'?: boolean;
      'ng-ssr-entry-bundle'?: boolean;
    };

    // Find all initial files
    const initialFiles = new Map<string, InitialFileRecord>();
    for (const outputFile of result.outputFiles) {
      // Entries in the metafile are relative to the `absWorkingDir` option which is set to the workspaceRoot
      const relativeFilePath = relative(this.workspaceRoot, outputFile.path);
      const entryPoint = result.metafile.outputs[relativeFilePath]?.entryPoint;

      outputFile.path = relativeFilePath;

      if (entryPoint) {
        // The first part of the filename is the name of file (e.g., "polyfills" for "polyfills-7S5G3MDY.js")
        const name = basename(relativeFilePath).replace(/(?:-[\dA-Z]{8})?\.[a-z]{2,3}$/, '');
        // Entry points are only styles or scripts
        const type = extname(relativeFilePath) === '.css' ? 'style' : 'script';

        // Only entrypoints with an entry in the options are initial files.
        // Dynamic imports also have an entryPoint value in the meta file.
        if ((this.#esbuildOptions.entryPoints as Record<string, string>)?.[name]) {
          // An entryPoint value indicates an initial file
          const record: InitialFileRecord = {
            name,
            type,
            entrypoint: true,
            serverFile: isPlatformServer,
            depth: 0,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(relativeFilePath, record);
          }
        }
      }
    }

    // Analyze for transitive initial files
    const entriesToAnalyze = [...initialFiles];
    let currentEntry;
    while ((currentEntry = entriesToAnalyze.pop())) {
      const [entryPath, entryRecord] = currentEntry;

      for (const initialImport of result.metafile.outputs[entryPath].imports) {
        const existingRecord = initialFiles.get(initialImport.path);
        if (existingRecord) {
          // Store the smallest value depth
          if (existingRecord.depth > entryRecord.depth + 1) {
            existingRecord.depth = entryRecord.depth + 1;
          }

          continue;
        }

        if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
          const record: InitialFileRecord = {
            type: initialImport.kind === 'import-rule' ? 'style' : 'script',
            entrypoint: false,
            external: initialImport.external,
            serverFile: isPlatformServer,
            depth: entryRecord.depth + 1,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(initialImport.path, record);
          }

          if (!initialImport.external) {
            entriesToAnalyze.push([initialImport.path, record]);
          }
        }
      }
    }

    // Collect all external package names
    const externalImports = new Set<string>();
    for (const { imports } of Object.values(result.metafile.outputs)) {
      for (const { external, kind, path } of imports) {
        if (
          !external ||
          SERVER_GENERATED_EXTERNALS.has(path) ||
          isInternalAngularFile(path) ||
          (kind !== 'import-statement' && kind !== 'dynamic-import' && kind !== 'require-call')
        ) {
          continue;
        }

        externalImports.add(path);
      }
    }

    assert(this.#esbuildOptions, 'esbuild options cannot be undefined.');

    const outputFiles = result.outputFiles.map((file) => {
      let fileType: BuildOutputFileType;
      // All files that are not JS, CSS, WASM, or sourcemaps for them are considered media
      if (!/\.([cm]?js|css|wasm)(\.map)?$/i.test(file.path)) {
        fileType = BuildOutputFileType.Media;
      } else if (isPlatformServer) {
        fileType = isSsrEntryBundle
          ? BuildOutputFileType.ServerRoot
          : BuildOutputFileType.ServerApplication;
      } else {
        fileType = BuildOutputFileType.Browser;
      }

      return convertOutputFile(file, fileType);
    });

    let externalConfiguration = this.#esbuildOptions.external;
    if (isPlatformServer && externalConfiguration) {
      externalConfiguration = externalConfiguration.filter(
        (dep) => !SERVER_GENERATED_EXTERNALS.has(dep),
      );

      if (!externalConfiguration.length) {
        externalConfiguration = undefined;
      }
    }

    // Return the successful build results
    return {
      ...result,
      outputFiles,
      initialFiles,
      externalImports,
      platform: isPlatformServer ? 'server' : 'browser',
      externalConfiguration,
      errors: undefined,
    };
  }

  #addErrorsToWatch(result: BuildFailure | BuildResult): void {
    for (const error of result.errors) {
      let file = error.location?.file;
      if (file && !isInternalAngularFile(file)) {
        this.watchFiles.add(isAbsolute(file) ? normalize(file) : join(this.workspaceRoot, file));
      }
      for (const note of error.notes) {
        file = note.location?.file;
        if (file && !isInternalAngularFile(file)) {
          this.watchFiles.add(isAbsolute(file) ? normalize(file) : join(this.workspaceRoot, file));
        }
      }
    }
  }

  #addLoadCacheFilesToWatch(): void {
    if (this.incremental && this.#loadCache) {
      for (const file of this.#loadCache.watchFiles) {
        if (!isInternalAngularFile(file)) {
          this.watchFiles.add(isAbsolute(file) ? normalize(file) : join(this.workspaceRoot, file));
        }
      }
    }
  }

  /**
   * Invalidate a stored bundler result based on the previous watch files
   * and a list of changed files.
   * The context must be created with incremental mode enabled for results
   * to be stored.
   * @returns True, if the result was invalidated; False, otherwise.
   */
  invalidate(files: Iterable<string> | ReadonlySet<string>): boolean {
    if (!this.incremental) {
      return false;
    }

    let candidateFiles: ReadonlySet<string>;
    if (files instanceof Set) {
      let isCandidateReady = true;
      for (const file of files) {
        if (
          file !== normalize(file) ||
          (!isAbsolute(file) && !files.has(normalize(join(this.workspaceRoot, file))))
        ) {
          isCandidateReady = false;
          break;
        }
      }

      if (isCandidateReady) {
        candidateFiles = files;
      } else {
        const normalizedFiles = new Set<string>();
        for (const file of files) {
          const normalized = normalize(file);
          normalizedFiles.add(normalized);
          if (!isAbsolute(normalized)) {
            normalizedFiles.add(normalize(join(this.workspaceRoot, normalized)));
          }
        }
        candidateFiles = normalizedFiles;
      }
    } else {
      const normalizedFiles = new Set<string>();
      for (const file of files) {
        const normalized = normalize(file);
        normalizedFiles.add(normalized);
        if (!isAbsolute(normalized)) {
          normalizedFiles.add(normalize(join(this.workspaceRoot, normalized)));
        }
      }
      candidateFiles = normalizedFiles;
    }

    let invalid = false;
    for (const file of candidateFiles) {
      if (this.#loadCache?.invalidate(file)) {
        invalid = true;
      }
    }

    if (!invalid) {
      if (this.watchFiles.size < candidateFiles.size) {
        for (const file of this.watchFiles) {
          if (candidateFiles.has(file)) {
            invalid = true;
            break;
          }
        }
      } else {
        for (const file of candidateFiles) {
          if (this.watchFiles.has(file)) {
            invalid = true;
            break;
          }
        }
      }
    }

    if (invalid) {
      this.#invalidationEpoch++;
      this.#esbuildResult = undefined;
    }

    return invalid;
  }

  /**
   * Disposes incremental build resources present in the context.
   *
   * @returns A promise that resolves when disposal is complete.
   */
  async dispose(): Promise<void> {
    this.#disposed = true;
    try {
      this.#esbuildOptions = undefined;
      this.#esbuildResult = undefined;
      this.#activeBundlePromise = undefined;
      this.#loadCache = undefined;
      await this.#esbuildContext?.dispose();
    } finally {
      this.#esbuildContext = undefined;
    }
  }
}

function isInternalAngularFile(file: string) {
  return file.startsWith('angular:');
}

function isInternalBundlerFile(file: string) {
  // Bundler virtual files such as "<define:???>" or "<runtime>"
  if (file.startsWith('<') && file.endsWith('>')) {
    return true;
  }

  // Any (disabled): path is a virtual esbuild entry that doesn't exist on disk
  if (file.includes('(disabled):')) {
    return true;
  }

  return false;
}
