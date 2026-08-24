/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuildFailure, BuildOptions, BuildResult, Plugin, build } from 'esbuild';
import assert from 'node:assert';
import path from 'node:path';
import { createContentHash } from '../../../utils/hash';
import { BundleContextResult } from '../bundler-context';
import { type BuildOutputFile, BuildOutputFileType, convertOutputFile } from '../bundler-files';
import { MemoryLoadResultCache } from '../load-result-cache';
import {
  BundleStylesheetOptions,
  createStylesheetBundleOptions,
} from '../stylesheets/bundle-options';

export type ComponentStylesheetResult = BundleContextResult & {
  contents: string;
  referencedFiles: Set<string> | undefined;
};

interface CachedComponentStylesheetBundle {
  rawResult: BundleContextResult;
  watchFiles: Set<string>;
}

interface BundledEntryResult {
  rawResult: BundleContextResult;
  watchFiles: Set<string>;
}

function isEsBuildFailure(value: unknown): value is BuildFailure {
  return !!value && typeof value === 'object' && 'errors' in value && 'warnings' in value;
}

function isInternalAngularFile(file: string): boolean {
  return file.startsWith('angular:');
}

function isInternalBundlerFile(file: string): boolean {
  // Bundler virtual files such as "<define:???>" or "<runtime>"
  if (file[0] === '<' && file.at(-1) === '>') {
    return true;
  }

  // Any (disabled): path is a virtual esbuild entry that doesn't exist on disk
  if (file.includes('(disabled):')) {
    return true;
  }

  return false;
}

/**
 * Bundles component stylesheets. A stylesheet can be either an inline stylesheet that
 * is contained within the Component's metadata definition or an external file referenced
 * from the Component's metadata definition.
 */
export class ComponentStylesheetBundler {
  readonly #fileEntries = new Map<string, { externalId?: string }>();
  readonly #fileResults = new Map<string, CachedComponentStylesheetBundle>();
  readonly #inlineResults = new Map<string, CachedComponentStylesheetBundle>();
  readonly #filePromises = new Map<string, Promise<BundledEntryResult>>();
  readonly #inlinePromises = new Map<string, Promise<BundledEntryResult>>();
  readonly #loadCache: MemoryLoadResultCache;
  #isDisposed = false;

  /**
   * @param options An object containing the stylesheet bundling options.
   * @param defaultInlineLanguage The default language to use for inline component styles.
   * @param incremental True if incremental watch mode is enabled.
   */
  constructor(
    private readonly options: BundleStylesheetOptions,
    private readonly defaultInlineLanguage: string,
    private readonly incremental: boolean,
  ) {
    this.#loadCache = new MemoryLoadResultCache();
  }

  /**
   * Bundle a file-based component stylesheet for use within an AOT compiled Angular application.
   * @param entry The file path of the stylesheet.
   * @param externalId Either an external identifier string for initial bundling or a boolean for rebuilds, if external.
   * @param direct If true, the output will be used directly by the builder; false if used inside the compiler plugin.
   * @returns A component bundle result object.
   */
  async bundleFile(
    entry: string,
    externalId?: string | boolean,
    direct?: boolean,
  ): Promise<ComponentStylesheetResult> {
    entry = path.normalize(entry);

    let entryMeta = this.#fileEntries.get(entry);
    if (typeof externalId === 'string') {
      if (!entryMeta) {
        entryMeta = { externalId };
        this.#fileEntries.set(entry, entryMeta);
      } else {
        entryMeta.externalId = externalId;
      }
    } else if (externalId === true) {
      assert(
        entryMeta?.externalId,
        'External component stylesheets rebuild must have a cached string identifier',
      );
      externalId = entryMeta.externalId;
    } else if (!entryMeta) {
      this.#fileEntries.set(entry, {});
    }

    const cached = this.#fileResults.get(entry);
    let rawResult: BundleContextResult;
    let watchFiles: Set<string>;

    if (this.incremental && cached) {
      rawResult = cached.rawResult;
      watchFiles = cached.watchFiles;
    } else {
      let bundlePromise = this.#filePromises.get(entry);
      if (!bundlePromise) {
        bundlePromise = this.#bundleFileEntry(entry, externalId);
        this.#filePromises.set(entry, bundlePromise);
      }

      try {
        const entryResult = await bundlePromise;
        rawResult = entryResult.rawResult;
        watchFiles = entryResult.watchFiles;

        if (
          this.incremental &&
          !this.#isDisposed &&
          this.#filePromises.get(entry) === bundlePromise
        ) {
          this.#fileResults.set(entry, {
            rawResult,
            watchFiles,
          });
        }
      } finally {
        if (this.#filePromises.get(entry) === bundlePromise) {
          this.#filePromises.delete(entry);
        }
      }
    }

    return this.extractResult(rawResult, watchFiles, !!externalId, !!direct);
  }

  async #bundleFileEntry(
    entry: string,
    externalId?: string | boolean,
  ): Promise<BundledEntryResult> {
    const buildOptions: BuildOptions & { metafile: true; write: false; plugins: Plugin[] } = {
      ...createStylesheetBundleOptions(this.options, this.#loadCache),
      metafile: true,
      write: false,
    };

    if (typeof externalId === 'string') {
      buildOptions.entryPoints = { [externalId]: entry };
      buildOptions.entryNames = '[name]';
      delete buildOptions.publicPath;
    } else {
      buildOptions.entryPoints = [entry];
    }

    // Angular encapsulation does not support nesting
    // See: https://github.com/angular/angular/issues/58996
    buildOptions.supported ??= {};
    buildOptions.supported['nesting'] = false;

    const watchFiles = new Set<string>();
    let buildResult: BuildResult<{ metafile: true; write: false }> | BuildFailure;

    try {
      buildResult = await build(buildOptions);
    } catch (failure) {
      if (isEsBuildFailure(failure)) {
        buildResult = failure;
      } else {
        throw failure;
      }
    }

    this.#collectWatchFiles(buildResult, watchFiles, entry);
    const rawResult = this.#convertEsbuildResult(buildResult);

    return { rawResult, watchFiles };
  }

  bundleAllFiles(external: boolean, direct: boolean): Promise<ComponentStylesheetResult[]> {
    return Promise.all(
      Array.from(this.#fileEntries.keys()).map((entry) => this.bundleFile(entry, external, direct)),
    );
  }

  async bundleInline(
    data: string,
    filename: string,
    language = this.defaultInlineLanguage,
    externalId?: string,
  ): Promise<ComponentStylesheetResult> {
    // Use a hash of the inline stylesheet content to ensure a consistent identifier. External stylesheets will resolve
    // to the actual stylesheet file path.
    const hasher = createContentHash();
    hasher.update(data);
    hasher.update(externalId ?? '');
    const id = hasher.digest();
    const entry = [language, id, filename].join(';');

    const cached = this.#inlineResults.get(entry);
    let rawResult: BundleContextResult;
    let watchFiles: Set<string>;

    if (this.incremental && cached) {
      rawResult = cached.rawResult;
      watchFiles = cached.watchFiles;
    } else {
      let bundlePromise = this.#inlinePromises.get(entry);
      if (!bundlePromise) {
        bundlePromise = this.#bundleInlineEntry(data, filename, entry, externalId);
        this.#inlinePromises.set(entry, bundlePromise);
      }

      try {
        const entryResult = await bundlePromise;
        rawResult = entryResult.rawResult;
        watchFiles = entryResult.watchFiles;

        if (
          this.incremental &&
          !this.#isDisposed &&
          this.#inlinePromises.get(entry) === bundlePromise
        ) {
          this.#inlineResults.set(entry, {
            rawResult,
            watchFiles,
          });
        }
      } finally {
        if (this.#inlinePromises.get(entry) === bundlePromise) {
          this.#inlinePromises.delete(entry);
        }
      }
    }

    return this.extractResult(rawResult, watchFiles, !!externalId, false);
  }

  async #bundleInlineEntry(
    data: string,
    filename: string,
    entry: string,
    externalId?: string,
  ): Promise<BundledEntryResult> {
    const namespace = 'angular:styles/component';
    const buildOptions: BuildOptions & { metafile: true; write: false; plugins: Plugin[] } = {
      ...createStylesheetBundleOptions(this.options, this.#loadCache, {
        [entry]: data,
      }),
      metafile: true,
      write: false,
    };

    if (externalId) {
      buildOptions.entryPoints = { [externalId]: `${namespace};${entry}` };
      buildOptions.entryNames = '[name]';
      delete buildOptions.publicPath;
    } else {
      buildOptions.entryPoints = [`${namespace};${entry}`];
    }

    // Angular encapsulation does not support nesting
    // See: https://github.com/angular/angular/issues/58996
    buildOptions.supported ??= {};
    buildOptions.supported['nesting'] = false;

    buildOptions.plugins.push({
      name: 'angular-component-styles',
      setup(build) {
        build.onResolve({ filter: /^angular:styles\/component;/ }, (args) => {
          if (args.kind !== 'entry-point') {
            return null;
          }

          return {
            path: entry,
            namespace,
          };
        });
        build.onLoad({ filter: /^css;/, namespace }, () => {
          return {
            contents: data,
            loader: 'css',
            resolveDir: path.dirname(filename),
          };
        });
      },
    });

    const watchFiles = new Set<string>();
    let buildResult: BuildResult<{ metafile: true; write: false }> | BuildFailure;

    try {
      buildResult = await build(buildOptions);
    } catch (failure) {
      if (isEsBuildFailure(failure)) {
        buildResult = failure;
      } else {
        throw failure;
      }
    }

    this.#collectWatchFiles(buildResult, watchFiles, filename, entry);
    const rawResult = this.#convertEsbuildResult(buildResult);

    return { rawResult, watchFiles };
  }

  #collectWatchFiles(
    buildResult: BuildResult<{ metafile: true; write: false }> | BuildFailure,
    watchFiles: Set<string>,
    entryOrContainingFile: string,
    inlineEntryKey?: string,
  ): void {
    if (!this.incremental) {
      return;
    }

    const toAbsolutePath = (file: string) =>
      path.normalize(path.isAbsolute(file) ? file : path.join(this.options.workspaceRoot, file));

    const addWatchFile = (file: string | undefined) => {
      if (!file || isInternalAngularFile(file) || isInternalBundlerFile(file)) {
        return;
      }
      watchFiles.add(toAbsolutePath(file));
    };

    if (buildResult.errors) {
      for (const error of buildResult.errors) {
        addWatchFile(error.location?.file);
        if (error.location?.file) {
          const absoluteErrorFile = toAbsolutePath(error.location.file);
          const cachedErrorLoad =
            this.#loadCache.get(error.location.file) ??
            this.#loadCache.get('file:' + absoluteErrorFile);
          if (cachedErrorLoad?.watchFiles) {
            for (const file of cachedErrorLoad.watchFiles) {
              addWatchFile(file);
            }
          }
        }
        for (const note of error.notes ?? []) {
          addWatchFile(note.location?.file);
          if (note.location?.file) {
            const absoluteNoteFile = toAbsolutePath(note.location.file);
            const cachedNoteLoad =
              this.#loadCache.get(note.location.file) ??
              this.#loadCache.get('file:' + absoluteNoteFile);
            if (cachedNoteLoad?.watchFiles) {
              for (const file of cachedNoteLoad.watchFiles) {
                addWatchFile(file);
              }
            }
          }
        }
      }
    }

    if (entryOrContainingFile) {
      addWatchFile(entryOrContainingFile);
    }

    if ('metafile' in buildResult && buildResult.metafile) {
      for (const input of Object.keys(buildResult.metafile.inputs)) {
        addWatchFile(input);

        const absoluteInput = toAbsolutePath(input);
        const cachedLoad =
          this.#loadCache.get(input) ?? this.#loadCache.get('file:' + absoluteInput);
        if (cachedLoad?.watchFiles) {
          for (const file of cachedLoad.watchFiles) {
            addWatchFile(file);
          }
        }
      }
    }

    if (entryOrContainingFile && !isInternalAngularFile(entryOrContainingFile)) {
      const absoluteEntry = toAbsolutePath(entryOrContainingFile);
      const cachedEntryLoad = this.#loadCache.get('file:' + absoluteEntry);
      if (cachedEntryLoad?.watchFiles) {
        for (const file of cachedEntryLoad.watchFiles) {
          addWatchFile(file);
        }
      }
    }

    if (inlineEntryKey) {
      const cachedInlineLoad = this.#loadCache.get('angular:styles/component:' + inlineEntryKey);
      if (cachedInlineLoad?.watchFiles) {
        for (const file of cachedInlineLoad.watchFiles) {
          addWatchFile(file);
        }
      }
    }
  }

  #convertEsbuildResult(
    result: BuildResult<{ metafile: true; write: false }> | BuildFailure,
  ): BundleContextResult {
    if (result.errors && result.errors.length > 0) {
      return {
        errors: result.errors,
        warnings: result.warnings ?? [],
      };
    }

    assert(
      'outputFiles' in result && result.outputFiles,
      'esbuild build result must contain outputFiles',
    );

    const outputFiles = result.outputFiles.map((file) => {
      let fileType: BuildOutputFileType;
      // All files that are not JS, CSS, WASM, or sourcemaps for them are considered media
      if (!/\.([cm]?js|css|wasm)(\.map)?$/i.test(file.path)) {
        fileType = BuildOutputFileType.Media;
      } else {
        fileType = BuildOutputFileType.Browser;
      }

      // Convert path to be relative to workspaceRoot
      file.path = path.relative(this.options.workspaceRoot, file.path);

      return convertOutputFile(file, fileType);
    });

    return {
      errors: undefined,
      warnings: result.warnings ?? [],
      metafile: result.metafile,
      outputFiles,
      initialFiles: new Map(),
      externalImports: new Set(),
      platform: 'browser',
    };
  }

  /**
   * Invalidates both file and inline based component style bundling state for a set of modified files.
   * @param files The group of files that have been modified
   * @returns An array of file based stylesheet entries if any were invalidated; otherwise, undefined.
   */
  invalidate(files: Iterable<string>): string[] | undefined {
    if (!this.incremental) {
      return;
    }

    const normalizedFiles = new Set<string>();
    for (const file of files) {
      const normalized = path.normalize(file);
      normalizedFiles.add(normalized);
      if (!path.isAbsolute(normalized)) {
        normalizedFiles.add(path.normalize(path.join(this.options.workspaceRoot, normalized)));
      }
    }

    for (const file of normalizedFiles) {
      this.#loadCache.invalidate(file);
    }

    const hasIntersection = (setA: Set<string>, setB: Set<string>): boolean => {
      if (setA.size < setB.size) {
        for (const value of setA) {
          if (setB.has(value)) {
            return true;
          }
        }
      } else {
        for (const value of setB) {
          if (setA.has(value)) {
            return true;
          }
        }
      }

      return false;
    };

    let entries: string[] | undefined;

    for (const [entry, cached] of this.#fileResults.entries()) {
      if (hasIntersection(cached.watchFiles, normalizedFiles)) {
        this.#fileResults.delete(entry);
        this.#filePromises.delete(entry);
        entries ??= [];
        entries.push(entry);
      }
    }

    for (const [entry, cached] of this.#inlineResults.entries()) {
      if (hasIntersection(cached.watchFiles, normalizedFiles)) {
        this.#inlineResults.delete(entry);
        this.#inlinePromises.delete(entry);
      }
    }

    for (const entry of this.#filePromises.keys()) {
      if (normalizedFiles.has(entry)) {
        this.#filePromises.delete(entry);
      }
    }

    for (const entry of this.#inlinePromises.keys()) {
      const parts = entry.split(';');
      const filename = parts.slice(2).join(';');
      if (filename && normalizedFiles.has(path.normalize(filename))) {
        this.#inlinePromises.delete(entry);
      }
    }

    return entries;
  }

  collectReferencedFiles(): string[] {
    const files: string[] = [];
    for (const cached of this.#fileResults.values()) {
      files.push(...cached.watchFiles);
    }
    for (const cached of this.#inlineResults.values()) {
      files.push(...cached.watchFiles);
    }

    return files;
  }

  async dispose(): Promise<void> {
    this.#isDisposed = true;
    this.#fileEntries.clear();
    this.#fileResults.clear();
    this.#inlineResults.clear();
    this.#filePromises.clear();
    this.#inlinePromises.clear();
    this.#loadCache.clear();
  }

  private extractResult(
    result: BundleContextResult,
    referencedFiles: Set<string> | undefined,
    external: boolean,
    direct: boolean,
  ): ComponentStylesheetResult {
    let contents = '';
    const outputFiles: BuildOutputFile[] = [];

    const { errors, warnings } = result;
    if (errors) {
      return { errors, warnings, referencedFiles, contents: '' };
    }

    for (const outputFile of result.outputFiles) {
      const filename = path.basename(outputFile.path);

      if (outputFile.type === BuildOutputFileType.Media || filename.endsWith('.css.map')) {
        // The output files could also contain resources (images/fonts/etc.) that were referenced and the map files.

        // Clone the output file to avoid amending the original path which would causes problems during rebuild.
        const clonedOutputFile = outputFile.clone();

        // Needed for Bazel as otherwise the files will not be written in the correct place,
        // this is because esbuild will resolve the output file from the outdir which is currently set to `workspaceRoot` twice,
        // once in the stylesheet and the other in the application code bundler.
        // Ex: `../../../../../app.component.css.map`.
        if (!direct) {
          clonedOutputFile.path = path.join(this.options.workspaceRoot, outputFile.path);
        }

        outputFiles.push(clonedOutputFile);
      } else if (filename.endsWith('.css')) {
        if (external) {
          const clonedOutputFile = outputFile.clone();
          if (!direct) {
            clonedOutputFile.path = path.join(this.options.workspaceRoot, outputFile.path);
          }
          outputFiles.push(clonedOutputFile);
          contents = path.posix.join(this.options.publicPath ?? '', filename);
        } else {
          contents = outputFile.text;
        }
      } else {
        throw new Error(
          `Unexpected non CSS/Media file "${filename}" outputted during component stylesheet processing.`,
        );
      }
    }

    // Clone metafile to prevent mutation of the cached result by downstream plugins
    const metafile = {
      inputs: { ...(result.metafile?.inputs ?? {}) },
      outputs: Object.fromEntries(
        Object.entries(result.metafile?.outputs ?? {}).map(([key, output]) => {
          const cloned = { ...output, ['ng-component']: true };
          delete cloned.entryPoint;

          return [key, cloned];
        }),
      ),
    };

    return {
      errors,
      warnings,
      contents,
      outputFiles,
      metafile,
      referencedFiles,
      externalImports: result.externalImports,
      platform: result.platform,
      initialFiles: new Map(),
    };
  }
}
