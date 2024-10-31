/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Message, PartialMessage } from 'esbuild';
import { normalize } from 'node:path';
import type { ChangedFiles } from '../../tools/esbuild/watcher';
import type { ComponentStylesheetBundler } from './angular/component-stylesheets';
import type { SourceFileCache } from './angular/source-file-cache';
import type { BuildOutputFile, BuildOutputFileType, BundlerContext } from './bundler-context';
import { createOutputFile } from './utils';

export interface BuildOutputAsset {
  source: string;
  destination: string;
}

export interface RebuildState {
  rebuildContexts: {
    typescriptContexts: BundlerContext[];
    otherContexts: BundlerContext[];
  };
  componentStyleBundler: ComponentStylesheetBundler;
  codeBundleCache?: SourceFileCache;
  fileChanges: ChangedFiles;
  previousOutputHashes: Map<string, string>;
}

export interface ExternalResultMetadata {
  implicitBrowser: string[];
  implicitServer: string[];
  explicit: string[];
}

export type PrerenderedRoutesRecord = Record<string, { headers?: Record<string, string> }>;

/**
 * Represents the result of a single builder execute call.
 */
export class ExecutionResult {
  outputFiles: BuildOutputFile[] = [];
  assetFiles: BuildOutputAsset[] = [];
  errors: (Message | PartialMessage)[] = [];
  prerenderedRoutes: PrerenderedRoutesRecord = {};
  warnings: (Message | PartialMessage)[] = [];
  logs: string[] = [];
  externalMetadata?: ExternalResultMetadata;
  extraWatchFiles: string[] = [];
  htmlIndexPath?: string;
  htmlBaseHref?: string;

  constructor(
    private rebuildContexts: {
      typescriptContexts: BundlerContext[];
      otherContexts: BundlerContext[];
    },
    private componentStyleBundler: ComponentStylesheetBundler,
    private codeBundleCache?: SourceFileCache,
  ) {}

  addOutputFile(path: string, content: string | Uint8Array, type: BuildOutputFileType): void {
    this.outputFiles.push(createOutputFile(path, content, type));
  }

  addAssets(assets: BuildOutputAsset[]): void {
    this.assetFiles.push(...assets);
  }

  addLog(value: string): void {
    this.logs.push(value);
  }

  addError(error: PartialMessage | string): void {
    if (typeof error === 'string') {
      this.errors.push({ text: error, location: null });
    } else {
      this.errors.push(error);
    }
  }

  addErrors(errors: (PartialMessage | string)[]): void {
    for (const error of errors) {
      this.addError(error);
    }
  }

  addPrerenderedRoutes(routes: PrerenderedRoutesRecord): void {
    Object.assign(this.prerenderedRoutes, routes);

    // Sort the prerendered routes.
    const sortedObj: PrerenderedRoutesRecord = {};
    for (const key of Object.keys(this.prerenderedRoutes).sort()) {
      sortedObj[key] = this.prerenderedRoutes[key];
    }

    this.prerenderedRoutes = sortedObj;
  }

  addWarning(error: PartialMessage | string): void {
    if (typeof error === 'string') {
      this.warnings.push({ text: error, location: null });
    } else {
      this.warnings.push(error);
    }
  }

  addWarnings(errors: (PartialMessage | string)[]): void {
    for (const error of errors) {
      this.addWarning(error);
    }
  }

  /**
   * Add external JavaScript import metadata to the result. This is currently used
   * by the development server to optimize the prebundling process.
   * @param implicitBrowser External dependencies for the browser bundles due to the external packages option.
   * @param implicitServer External dependencies for the server bundles due to the external packages option.
   * @param explicit External dependencies due to explicit project configuration.
   */
  setExternalMetadata(
    implicitBrowser: string[],
    implicitServer: string[],
    explicit: string[] | undefined,
  ): void {
    this.externalMetadata = { implicitBrowser, implicitServer, explicit: explicit ?? [] };
  }

  get output() {
    return {
      success: this.errors.length === 0,
    };
  }

  get outputWithFiles() {
    return {
      success: this.errors.length === 0,
      outputFiles: this.outputFiles,
      assetFiles: this.assetFiles,
      errors: this.errors,
      externalMetadata: this.externalMetadata,
    };
  }

  get watchFiles() {
    // Bundler contexts internally normalize file dependencies
    const files = this.rebuildContexts.typescriptContexts
      .flatMap((context) => [...context.watchFiles])
      .concat(this.rebuildContexts.otherContexts.flatMap((context) => [...context.watchFiles]));
    if (this.codeBundleCache?.referencedFiles) {
      // These files originate from TS/NG and can have POSIX path separators even on Windows.
      // To ensure path comparisons are valid, all these paths must be normalized.
      files.push(...this.codeBundleCache.referencedFiles.map(normalize));
    }
    if (this.codeBundleCache?.loadResultCache) {
      // Load result caches internally normalize file dependencies
      files.push(...this.codeBundleCache.loadResultCache.watchFiles);
    }

    return files.concat(this.extraWatchFiles);
  }

  createRebuildState(fileChanges: ChangedFiles): RebuildState {
    return {
      rebuildContexts: this.rebuildContexts,
      codeBundleCache: this.codeBundleCache,
      componentStyleBundler: this.componentStyleBundler,
      fileChanges,
      previousOutputHashes: new Map(this.outputFiles.map((file) => [file.path, file.hash])),
    };
  }

  findChangedFiles(previousOutputHashes: Map<string, string>): Set<string> {
    const changed = new Set<string>();
    for (const file of this.outputFiles) {
      const previousHash = previousOutputHashes.get(file.path);
      if (previousHash === undefined || previousHash !== file.hash) {
        changed.add(file.path);
      }
    }

    return changed;
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([
      ...this.rebuildContexts.typescriptContexts.map((context) => context.dispose()),
      ...this.rebuildContexts.otherContexts.map((context) => context.dispose()),
      this.componentStyleBundler.dispose(),
    ]);
  }
}
