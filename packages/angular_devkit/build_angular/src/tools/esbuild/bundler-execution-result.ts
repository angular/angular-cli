/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Message, PartialMessage } from 'esbuild';
import type { ChangedFiles } from '../../tools/esbuild/watcher';
import type { SourceFileCache } from './angular/source-file-cache';
import type { BuildOutputFile, BuildOutputFileType, BundlerContext } from './bundler-context';
import { createOutputFileFromText } from './utils';

export interface BuildOutputAsset {
  source: string;
  destination: string;
}

export interface RebuildState {
  rebuildContexts: BundlerContext[];
  codeBundleCache?: SourceFileCache;
  fileChanges: ChangedFiles;
  previousOutputHashes: Map<string, string>;
}

/**
 * Represents the result of a single builder execute call.
 */
export class ExecutionResult {
  outputFiles: BuildOutputFile[] = [];
  assetFiles: BuildOutputAsset[] = [];
  errors: (Message | PartialMessage)[] = [];
  externalMetadata?: { implicit: string[]; explicit?: string[] };

  constructor(
    private rebuildContexts: BundlerContext[],
    private codeBundleCache?: SourceFileCache,
  ) {}

  addOutputFile(path: string, content: string, type: BuildOutputFileType): void {
    this.outputFiles.push(createOutputFileFromText(path, content, type));
  }

  addAssets(assets: BuildOutputAsset[]): void {
    this.assetFiles.push(...assets);
  }

  addErrors(errors: (Message | PartialMessage)[]): void {
    this.errors.push(...errors);
  }

  /**
   * Add external JavaScript import metadata to the result. This is currently used
   * by the development server to optimize the prebundling process.
   * @param implicit External dependencies due to the external packages option.
   * @param explicit External dependencies due to explicit project configuration.
   */
  setExternalMetadata(implicit: string[], explicit: string[] | undefined) {
    this.externalMetadata = { implicit, explicit };
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
    const files = this.rebuildContexts.flatMap((context) => [...context.watchFiles]);
    if (this.codeBundleCache?.referencedFiles) {
      files.push(...this.codeBundleCache.referencedFiles);
    }
    if (this.codeBundleCache?.loadResultCache) {
      files.push(...this.codeBundleCache.loadResultCache.watchFiles);
    }

    return files;
  }

  createRebuildState(fileChanges: ChangedFiles): RebuildState {
    this.codeBundleCache?.invalidate([...fileChanges.modified, ...fileChanges.removed]);

    return {
      rebuildContexts: this.rebuildContexts,
      codeBundleCache: this.codeBundleCache,
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
    await Promise.allSettled(this.rebuildContexts.map((context) => context.dispose()));
  }
}
