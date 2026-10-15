/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ExecutionResult } from './execution-result';
import type {
  BundleResult,
  LibraryCompilationOutput,
  NormalizedLibraryOptions,
  SingleProgramCache,
} from './types';

/**
 * Encapsulates incremental compilation state, watched compilation file tracking,
 * and execution results across watch-mode rebuilds.
 */
export class BuilderState {
  readonly #watchedCompilationFiles = new Set<string>();
  readonly #pendingCompilationFiles = new Set<string>();

  #executionResult = new ExecutionResult();
  #singleProgramCache?: SingleProgramCache;
  #compilationMode?: 'partial' | 'full';

  /** Map of entry point names to their previous bundle results. */
  readonly previousBundleResults = new Map<string, BundleResult>();

  /** Set of changed POSIX ESM file paths pending bundling. */
  readonly pendingChangedEsmFiles = new Set<string>();

  /** Set of changed POSIX TypeScript declaration file paths pending bundling. */
  readonly pendingChangedDtsFiles = new Set<string>();

  /** Whether the previous build iteration encountered a compilation or diagnostic error. */
  hasCompilationError = false;

  /** Whether package.json and secondary entry point manifests have been emitted. */
  hasEmittedManifests = false;

  /** Whether the last emitted root package.json included a tslib dependency. */
  hasEmittedTslib = false;

  /** Whether static assets have been emitted in a prior iteration. */
  hasEmittedAssets = false;

  /** Whether entry points in package.json changed since the last compilation. */
  hasEntryPointsChanges = false;

  constructor(
    options?: Partial<
      Pick<NormalizedLibraryOptions, 'tsConfigPath' | 'packageJsonPath' | 'entryPoints'>
    >,
  ) {
    if (options?.tsConfigPath) {
      this.#watchedCompilationFiles.add(options.tsConfigPath);
    }
    if (options?.packageJsonPath) {
      this.#watchedCompilationFiles.add(options.packageJsonPath);
    }
    if (options?.entryPoints) {
      for (const entryPoint of options.entryPoints.values()) {
        this.#watchedCompilationFiles.add(entryPoint.entryFilePath);
      }
    }
  }

  /** Cached unified TypeScript and Angular compilation state. */
  get singleProgramCache(): SingleProgramCache | undefined {
    return this.#singleProgramCache;
  }

  /** Effective compilation mode resolved from builder options and tsconfig. */
  get compilationMode(): 'partial' | 'full' | undefined {
    return this.#compilationMode;
  }

  /** Whether any active entry point bundle imports `tslib`. */
  get hasTslibImport(): boolean {
    for (const result of this.previousBundleResults.values()) {
      if (result.hasTslibImport) {
        return true;
      }
    }

    return false;
  }

  /**
   * Set of POSIX file paths tracked for compilation and configuration
   * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
   * template, and stylesheet files).
   */
  get watchedCompilationFiles(): Set<string> {
    return this.#watchedCompilationFiles;
  }

  /**
   * Execution result holding errors, warnings, and logs for the current build iteration.
   */
  get executionResult(): ExecutionResult {
    return this.#executionResult;
  }

  /**
   * Resets the execution result for a new build iteration.
   *
   * @returns The fresh `ExecutionResult` instance for the current build iteration.
   */
  resetExecutionResult(): ExecutionResult {
    this.#executionResult = new ExecutionResult();

    return this.#executionResult;
  }

  /**
   * Determines whether compilation and bundling need to run for the current build iteration.
   * Also records incoming modified files so they are retained if the iteration aborts early.
   *
   * @param packageJsonPath Normalized POSIX path to the library's `package.json`.
   * @param modifiedFiles Optional set of modified POSIX file paths in watch mode.
   * @returns `true` if entry points should be compiled; otherwise `false`.
   */
  shouldCompileEntryPoints(packageJsonPath: string, modifiedFiles?: ReadonlySet<string>): boolean {
    if (modifiedFiles) {
      for (const file of modifiedFiles) {
        if (file !== packageJsonPath) {
          this.#pendingCompilationFiles.add(file);
        }
      }
    }

    if (
      !modifiedFiles ||
      !this.#singleProgramCache ||
      this.hasCompilationError ||
      this.hasEntryPointsChanges ||
      this.pendingChangedEsmFiles.size > 0 ||
      this.pendingChangedDtsFiles.size > 0
    ) {
      return true;
    }

    for (const file of this.#pendingCompilationFiles) {
      if (this.#watchedCompilationFiles.has(file)) {
        return true;
      }
    }

    this.#pendingCompilationFiles.clear();

    return false;
  }

  /**
   * Returns the effective set of modified POSIX file paths for compilation,
   * merging any pending compilation files from earlier aborted iterations.
   *
   * @param modifiedFiles Optional set of modified POSIX file paths from the current iteration.
   * @returns Merged set of modified POSIX file paths, or `undefined` for a full compilation.
   */
  getCompilationModifiedFiles(modifiedFiles?: ReadonlySet<string>): Set<string> | undefined {
    if (!modifiedFiles) {
      this.#pendingCompilationFiles.clear();

      return undefined;
    }

    const files = new Set(modifiedFiles);
    for (const file of this.#pendingCompilationFiles) {
      files.add(file);
    }

    return files;
  }

  /**
   * Records compilation output into the build state, updating the program cache,
   * watched compilation files, and pending changed ESM/DTS file sets.
   *
   * @param output The compilation output produced by `compileLibrary`.
   */
  recordCompilationOutput(output: LibraryCompilationOutput): void {
    this.#pendingCompilationFiles.clear();
    this.#singleProgramCache = output.cache;
    if (this.#compilationMode !== output.compilationMode) {
      this.#compilationMode = output.compilationMode;
      this.hasEmittedManifests = false;
    }

    for (const file of output.referencedFiles) {
      this.#watchedCompilationFiles.add(file);
    }
    for (const file of output.changedEsmFiles) {
      this.pendingChangedEsmFiles.add(file);
    }
    for (const file of output.changedDtsFiles) {
      this.pendingChangedDtsFiles.add(file);
    }
  }

  /**
   * Records active bundle results across entry points after compilation and bundling succeed,
   * clearing pending compilation/bundle flags.
   *
   * @param bundleResults Newly bundled results keyed by entry point name.
   */
  recordBundleOutput(bundleResults: ReadonlyMap<string, BundleResult>): void {
    this.hasCompilationError = false;
    this.hasEntryPointsChanges = false;
    this.pendingChangedEsmFiles.clear();
    this.pendingChangedDtsFiles.clear();

    for (const [name, bundleResult] of bundleResults) {
      this.previousBundleResults.set(name, bundleResult);
    }
  }

  /**
   * Disposes active compilation resources and clears cached state.
   */
  async dispose(): Promise<void> {
    await this.#singleProgramCache?.compilationInstance.close?.();
    this.#singleProgramCache = undefined;
    this.#compilationMode = undefined;
    this.hasEmittedTslib = false;
    this.hasEmittedAssets = false;
    this.hasCompilationError = false;
    this.hasEmittedManifests = false;
    this.hasEntryPointsChanges = false;
    this.previousBundleResults.clear();
    this.pendingChangedEsmFiles.clear();
    this.pendingChangedDtsFiles.clear();
    this.#pendingCompilationFiles.clear();
    this.#watchedCompilationFiles.clear();
  }
}
