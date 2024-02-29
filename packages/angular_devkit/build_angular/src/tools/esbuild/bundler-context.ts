/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildContext,
  BuildFailure,
  BuildOptions,
  BuildResult,
  Message,
  Metafile,
  OutputFile,
  build,
  context,
} from 'esbuild';
import assert from 'node:assert';
import { basename, dirname, extname, join, relative } from 'node:path';
import { LoadResultCache, MemoryLoadResultCache } from './load-result-cache';
import { convertOutputFile } from './utils';

export type BundleContextResult =
  | { errors: Message[]; warnings: Message[] }
  | {
      errors: undefined;
      warnings: Message[];
      metafile: Metafile;
      outputFiles: BuildOutputFile[];
      initialFiles: Map<string, InitialFileRecord>;
      externalImports: {
        server?: Set<string>;
        browser?: Set<string>;
      };
      externalConfiguration?: string[];
    };

export interface InitialFileRecord {
  entrypoint: boolean;
  name?: string;
  type: 'script' | 'style';
  external?: boolean;
  serverFile: boolean;
}

export enum BuildOutputFileType {
  Browser = 1,
  Media = 2,
  Server = 3,
  Root = 4,
}

export interface BuildOutputFile extends OutputFile {
  type: BuildOutputFileType;
  clone: () => BuildOutputFile;
}

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
  #optionsFactory: BundlerOptionsFactory<BuildOptions & { metafile: true; write: false }>;
  #shouldCacheResult: boolean;
  #loadCache?: MemoryLoadResultCache;
  readonly watchFiles = new Set<string>();

  constructor(
    private workspaceRoot: string,
    private incremental: boolean,
    options: BuildOptions | BundlerOptionsFactory,
    private initialFilter?: (initial: Readonly<InitialFileRecord>) => boolean,
  ) {
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

  static async bundleAll(
    contexts: Iterable<BundlerContext>,
    changedFiles?: Iterable<string>,
  ): Promise<BundleContextResult> {
    const individualResults = await Promise.all(
      [...contexts].map((context) => {
        if (changedFiles) {
          context.invalidate(changedFiles);
        }

        return context.bundle();
      }),
    );

    // Return directly if only one result
    if (individualResults.length === 1) {
      return individualResults[0];
    }

    let errors: Message[] | undefined;
    const warnings: Message[] = [];
    const metafile: Metafile = { inputs: {}, outputs: {} };
    const initialFiles = new Map<string, InitialFileRecord>();
    const externalImportsBrowser = new Set<string>();
    const externalImportsServer = new Set<string>();

    const outputFiles = [];
    let externalConfiguration;
    for (const result of individualResults) {
      warnings.push(...result.warnings);
      if (result.errors) {
        errors ??= [];
        errors.push(...result.errors);
        continue;
      }

      // Combine metafiles used for the stats option as well as bundle budgets and console output
      if (result.metafile) {
        metafile.inputs = { ...metafile.inputs, ...result.metafile.inputs };
        metafile.outputs = { ...metafile.outputs, ...result.metafile.outputs };
      }

      result.initialFiles.forEach((value, key) => initialFiles.set(key, value));
      outputFiles.push(...result.outputFiles);
      result.externalImports.browser?.forEach((value) => externalImportsBrowser.add(value));
      result.externalImports.server?.forEach((value) => externalImportsServer.add(value));

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
      metafile,
      initialFiles,
      outputFiles,
      externalImports: {
        browser: externalImportsBrowser,
        server: externalImportsServer,
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
   * @returns If output files are generated, the full esbuild BuildResult; if not, the
   * warnings and errors for the attempted build.
   */
  async bundle(): Promise<BundleContextResult> {
    // Return existing result if present
    if (this.#esbuildResult) {
      return this.#esbuildResult;
    }

    const result = await this.#performBundle();
    if (this.#shouldCacheResult) {
      this.#esbuildResult = result;
    }

    return result;
  }

  async #performBundle(): Promise<BundleContextResult> {
    // Create esbuild options if not present
    if (this.#esbuildOptions === undefined) {
      if (this.incremental) {
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
      } else if (this.incremental) {
        // Create an incremental build context and perform the first build.
        // Context creation does not perform a build.
        this.#esbuildContext = await context(this.#esbuildOptions);
        result = await this.#esbuildContext.rebuild();
      } else {
        // For non-incremental builds, perform a single build
        result = await build(this.#esbuildOptions);
      }

      if (this.#platformIsServer) {
        for (const entry of Object.values(result.metafile.outputs)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry as any)['ng-platform-server'] = true;
        }
      }
    } catch (failure) {
      // Build failures will throw an exception which contains errors/warnings
      if (isEsBuildFailure(failure)) {
        this.#addErrorsToWatch(failure);

        return failure;
      } else {
        throw failure;
      }
    } finally {
      if (this.incremental) {
        // When incremental always add any files from the load result cache
        if (this.#loadCache) {
          for (const file of this.#loadCache.watchFiles) {
            if (!isInternalAngularFile(file)) {
              // watch files are fully resolved paths
              this.watchFiles.add(file);
            }
          }
        }
      }
    }

    // Update files that should be watched.
    // While this should technically not be linked to incremental mode, incremental is only
    // currently enabled with watch mode where watch files are needed.
    if (this.incremental) {
      // Add input files except virtual angular files which do not exist on disk
      for (const input of Object.keys(result.metafile.inputs)) {
        if (!isInternalAngularFile(input)) {
          // input file paths are always relative to the workspace root
          this.watchFiles.add(join(this.workspaceRoot, input));
        }
      }
    }

    // Return if the build encountered any errors
    if (result.errors.length) {
      this.#addErrorsToWatch(result);

      return {
        errors: result.errors,
        warnings: result.warnings,
      };
    }

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
            serverFile: this.#platformIsServer,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(relativeFilePath, record);
          }
        }
      }
    }

    // Analyze for transitive initial files
    const files = [...initialFiles.keys()];
    for (const file of files) {
      for (const initialImport of result.metafile.outputs[file].imports) {
        if (initialFiles.has(initialImport.path)) {
          continue;
        }

        if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
          const record: InitialFileRecord = {
            type: initialImport.kind === 'import-rule' ? 'style' : 'script',
            entrypoint: false,
            external: initialImport.external,
            serverFile: this.#platformIsServer,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(initialImport.path, record);
          }

          if (!initialImport.external) {
            files.push(initialImport.path);
          }
        }
      }
    }

    // Collect all external package names
    const externalImports = new Set<string>();
    for (const { imports } of Object.values(result.metafile.outputs)) {
      for (const importData of imports) {
        if (
          !importData.external ||
          (importData.kind !== 'import-statement' &&
            importData.kind !== 'dynamic-import' &&
            importData.kind !== 'require-call')
        ) {
          continue;
        }
        externalImports.add(importData.path);
      }
    }

    assert(this.#esbuildOptions, 'esbuild options cannot be undefined.');

    const outputFiles = result.outputFiles.map((file) => {
      let fileType: BuildOutputFileType;
      // All files that are not JS, CSS, WASM, or sourcemaps for them are considered media
      if (!/\.([cm]?js|css|wasm)(\.map)?$/i.test(file.path)) {
        fileType = BuildOutputFileType.Media;
      } else {
        fileType = this.#platformIsServer
          ? BuildOutputFileType.Server
          : BuildOutputFileType.Browser;
      }

      return convertOutputFile(file, fileType);
    });

    // Return the successful build results
    return {
      ...result,
      outputFiles,
      initialFiles,
      externalImports: {
        [this.#platformIsServer ? 'server' : 'browser']: externalImports,
      },
      externalConfiguration: this.#esbuildOptions.external,
      errors: undefined,
    };
  }

  #addErrorsToWatch(result: BuildFailure | BuildResult): void {
    for (const error of result.errors) {
      let file = error.location?.file;
      if (file && !isInternalAngularFile(file)) {
        this.watchFiles.add(join(this.workspaceRoot, file));
      }
      for (const note of error.notes) {
        file = note.location?.file;
        if (file && !isInternalAngularFile(file)) {
          this.watchFiles.add(join(this.workspaceRoot, file));
        }
      }
    }
  }

  get #platformIsServer(): boolean {
    return this.#esbuildOptions?.platform === 'node';
  }

  /**
   * Invalidate a stored bundler result based on the previous watch files
   * and a list of changed files.
   * The context must be created with incremental mode enabled for results
   * to be stored.
   * @returns True, if the result was invalidated; False, otherwise.
   */
  invalidate(files: Iterable<string>): boolean {
    if (!this.incremental) {
      return false;
    }

    let invalid = false;
    for (const file of files) {
      if (this.#loadCache?.invalidate(file)) {
        invalid = true;
        continue;
      }

      invalid ||= this.watchFiles.has(file);
    }

    if (invalid) {
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
    try {
      this.#esbuildOptions = undefined;
      this.#esbuildResult = undefined;
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
