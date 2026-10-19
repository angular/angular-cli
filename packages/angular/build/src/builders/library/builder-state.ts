/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { toPosixPath } from '../../utils/path';
import { ExecutionResult } from './execution-result';
import {
  type AssetMatcher,
  type CollectedAssets,
  collectAssetsToEmit,
  createAssetMatchers,
} from './pipeline/assets';
import type { OutputFile } from './pipeline/utils';
import type {
  BundleResult,
  LibraryCompilationOutput,
  NormalizedLibraryOptions,
  SingleProgramCache,
} from './types';

/**
 * Encapsulates incremental compilation state, transitive resource reference tracking,
 * asset matchers, and emitted output file tracking across watch-mode rebuilds.
 */
export class BuilderState {
  readonly #referencingFiles = new Map<string, Set<string>>();
  readonly #referencedByFile = new Map<string, Set<string>>();
  readonly #watchedCompilationFiles = new Set<string>();
  readonly #pendingCompilationFiles = new Set<string>();
  readonly #pendingAssetFiles = new Set<string>();
  readonly #assetMatchers?: readonly AssetMatcher[];

  #emittedBundleFiles = new Set<string>();
  #emittedManifestFiles = new Set<string>();
  readonly #emittedAssets = new Map<string, Set<string>>();
  #hasEmittedAssets = false;

  #executionResult = new ExecutionResult();
  #hasUpdatedBundles = false;

  #singleProgramCache?: SingleProgramCache;
  #compilationMode?: 'partial' | 'full';
  #hasEmittedTslib = false;

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

  /** Whether entry points in package.json changed since the last compilation. */
  hasEntryPointsChanges = false;

  constructor(
    options?: Partial<
      Pick<NormalizedLibraryOptions, 'tsConfigPath' | 'packageJsonPath' | 'entryPoints' | 'assets'>
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

    this.#assetMatchers = options?.assets ? createAssetMatchers(options.assets) : undefined;
  }

  /** Cached unified TypeScript and Angular compilation state. */
  get singleProgramCache(): SingleProgramCache | undefined {
    return this.#singleProgramCache;
  }

  /** Effective compilation mode resolved from builder options and tsconfig. */
  get compilationMode(): 'partial' | 'full' | undefined {
    return this.#compilationMode;
  }

  /** Whether the last emitted root package.json included a tslib dependency. */
  get hasEmittedTslib(): boolean {
    return this.#hasEmittedTslib;
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
   * Resets the execution result and staged output state for a new build iteration.
   *
   * @returns The fresh `ExecutionResult` instance for the current build iteration.
   */
  resetExecutionResult(): ExecutionResult {
    this.#executionResult = new ExecutionResult();
    this.#hasUpdatedBundles = false;

    return this.#executionResult;
  }

  /**
   * Records transitive resource dependencies (such as Sass partials) for a containing
   * component or stylesheet file and registers them in `watchedCompilationFiles`.
   * Multiple calls for the same containing file accumulate references additively.
   *
   * @param containingFile Path of the referencing component or stylesheet file.
   * @param referencedFiles Paths of the referenced files.
   */
  addFileReferences(containingFile: string, referencedFiles: Iterable<string>): void {
    const posixContainingFile = toPosixPath(containingFile);
    let forwardReferences = this.#referencedByFile.get(posixContainingFile);

    for (const file of referencedFiles) {
      const posixFile = toPosixPath(file);
      this.#watchedCompilationFiles.add(posixFile);
      if (posixFile === posixContainingFile) {
        continue;
      }

      if (!forwardReferences) {
        forwardReferences = new Set();
        this.#referencedByFile.set(posixContainingFile, forwardReferences);
      }
      forwardReferences.add(posixFile);

      let referencing = this.#referencingFiles.get(posixFile);
      if (!referencing) {
        referencing = new Set();
        this.#referencingFiles.set(posixFile, referencing);
      }
      referencing.add(posixContainingFile);
    }
  }

  /**
   * Clears previously recorded outgoing resource references for the given containing files
   * before they are recompiled.
   *
   * @param containingFiles Paths of the containing or stylesheet files being recompiled.
   */
  clearFileReferences(containingFiles: Iterable<string>): void {
    for (const containingFile of containingFiles) {
      const posixContainingFile = toPosixPath(containingFile);
      const forwardReferences = this.#referencedByFile.get(posixContainingFile);
      if (!forwardReferences) {
        continue;
      }

      for (const prevRef of forwardReferences) {
        const referencing = this.#referencingFiles.get(prevRef);
        if (referencing) {
          referencing.delete(posixContainingFile);
          if (referencing.size === 0) {
            this.#referencingFiles.delete(prevRef);
          }
        }
      }

      this.#referencedByFile.delete(posixContainingFile);
    }
  }

  /**
   * Returns the set of all files affected by the given changed files, including the
   * changed files themselves and all transitively referencing files
   * (e.g., partial `.scss` -> component `.scss` -> component `.ts`).
   *
   * @param files Initial changed file paths.
   * @returns Set of POSIX paths including all transitively referencing files.
   */
  getAffectedFiles(files: Iterable<string>): Set<string> {
    const affected = new Set<string>();
    for (const file of files) {
      affected.add(toPosixPath(file));
    }

    for (const file of affected) {
      const referencing = this.#referencingFiles.get(file);
      if (referencing) {
        for (const refFile of referencing) {
          affected.add(refFile);
        }
      }
    }

    return affected;
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
        if (this.#hasEmittedAssets) {
          this.#pendingAssetFiles.add(file);
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
   * Records active bundle results across entry points after compilation and bundling succeed
   * and clears pending compilation/bundle flags.
   *
   * @param bundleResults Newly bundled results keyed by entry point name.
   */
  recordBundleOutput(bundleResults: ReadonlyMap<string, BundleResult>): void {
    const hadEntryPointsChanges = this.hasEntryPointsChanges;
    this.hasCompilationError = false;
    this.hasEntryPointsChanges = false;
    this.pendingChangedEsmFiles.clear();
    this.pendingChangedDtsFiles.clear();

    for (const [name, bundleResult] of bundleResults) {
      this.previousBundleResults.set(name, bundleResult);
    }

    if (bundleResults.size > 0 || hadEntryPointsChanges || this.#emittedBundleFiles.size === 0) {
      this.#hasUpdatedBundles = true;
    }
  }

  /**
   * Resolves and collects configured library assets to be emitted to or deleted from disk.
   *
   * @param options Normalized library options containing `assets` and `workspaceRoot`.
   * @param modifiedFiles Optional set of modified POSIX file paths in watch mode.
   * @returns The collected asset files to emit and delete.
   */
  collectAssets(
    options: Pick<NormalizedLibraryOptions, 'assets' | 'workspaceRoot'>,
    modifiedFiles?: ReadonlySet<string>,
  ): Promise<CollectedAssets> {
    let effectiveModifiedFiles: ReadonlySet<string> | undefined;
    if (this.#hasEmittedAssets && modifiedFiles) {
      for (const file of modifiedFiles) {
        this.#pendingAssetFiles.add(file);
      }
      effectiveModifiedFiles = this.#pendingAssetFiles;
    }

    return collectAssetsToEmit(
      options.assets,
      options.workspaceRoot,
      this.#emittedAssets,
      effectiveModifiedFiles,
      this.#assetMatchers,
    );
  }

  /**
   * Records emitted bundle, manifest, and asset output files after disk emission,
   * returning any stale or deleted output paths to remove from disk.
   *
   * @param collectedAssets Collected asset files emitted and deleted in this iteration.
   * @param manifestFiles Optional manifest output files generated in this iteration.
   * @returns Read-only set of relative POSIX output paths to delete from disk.
   */
  recordEmittedOutputs(
    collectedAssets: CollectedAssets,
    manifestFiles?: readonly OutputFile[],
  ): ReadonlySet<string> {
    const filesToDelete = new Set<string>();

    if (this.#hasUpdatedBundles) {
      this.#hasUpdatedBundles = false;
      const nextBundleFiles = new Set<string>();
      for (const result of this.previousBundleResults.values()) {
        for (const file of result.esmOutputFiles) {
          nextBundleFiles.add(file);
        }
        for (const file of result.dtsOutputFiles) {
          nextBundleFiles.add(file);
        }
      }

      for (const prevFile of this.#emittedBundleFiles) {
        if (!nextBundleFiles.has(prevFile)) {
          filesToDelete.add(prevFile);
        }
      }

      this.#emittedBundleFiles = nextBundleFiles;
    }

    if (manifestFiles) {
      const nextManifestFiles = new Set(manifestFiles.map((file) => file.path));
      for (const prevFile of this.#emittedManifestFiles) {
        if (!nextManifestFiles.has(prevFile)) {
          filesToDelete.add(prevFile);
        }
      }

      this.#emittedManifestFiles = nextManifestFiles;
    }

    const { filesToDelete: toDelete, filesToEmit: toEmit } = collectedAssets;

    for (const emittedAsset of toEmit) {
      let outputs = this.#emittedAssets.get(emittedAsset.source);
      if (!outputs) {
        outputs = new Set();
        this.#emittedAssets.set(emittedAsset.source, outputs);
      }
      outputs.add(emittedAsset.path);
    }

    if (toDelete.length) {
      const candidateDeletes = new Set<string>();
      for (const source of toDelete) {
        const outputs = this.#emittedAssets.get(source);
        if (outputs) {
          for (const output of outputs) {
            candidateDeletes.add(output);
          }
          this.#emittedAssets.delete(source);
        }
      }

      for (const outputs of this.#emittedAssets.values()) {
        for (const output of outputs) {
          candidateDeletes.delete(output);
        }
      }

      for (const output of candidateDeletes) {
        filesToDelete.add(output);
      }
    }

    this.hasEmittedManifests = true;
    this.#hasEmittedTslib = this.hasTslibImport;
    this.#hasEmittedAssets = true;
    this.#pendingAssetFiles.clear();

    return filesToDelete;
  }

  /**
   * Disposes active compilation resources and clears cached state.
   */
  async dispose(): Promise<void> {
    await this.#singleProgramCache?.compilationInstance.close?.();
    this.#singleProgramCache = undefined;
    this.#compilationMode = undefined;
    this.#hasEmittedTslib = false;
    this.#hasEmittedAssets = false;
    this.hasCompilationError = false;
    this.hasEmittedManifests = false;
    this.hasEntryPointsChanges = false;
    this.previousBundleResults.clear();
    this.pendingChangedEsmFiles.clear();
    this.pendingChangedDtsFiles.clear();
    this.#pendingCompilationFiles.clear();
    this.#pendingAssetFiles.clear();
    this.#referencingFiles.clear();
    this.#referencedByFile.clear();
    this.#watchedCompilationFiles.clear();
    this.#emittedBundleFiles.clear();
    this.#emittedManifestFiles.clear();
    this.#emittedAssets.clear();
    this.#hasUpdatedBundles = false;
  }
}
