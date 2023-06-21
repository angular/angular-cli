/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { OutputFile } from 'esbuild';
import type { ChangedFiles } from '../../tools/esbuild/watcher';
import type { SourceFileCache } from './angular/compiler-plugin';
import type { BundlerContext } from './bundler-context';
import { createOutputFileFromText } from './utils';

export interface RebuildState {
  rebuildContexts: BundlerContext[];
  codeBundleCache?: SourceFileCache;
  fileChanges: ChangedFiles;
}

/**
 * Represents the result of a single builder execute call.
 */
export class ExecutionResult {
  readonly outputFiles: OutputFile[] = [];
  readonly assetFiles: { source: string; destination: string }[] = [];

  constructor(
    private rebuildContexts: BundlerContext[],
    private codeBundleCache?: SourceFileCache,
  ) {}

  addOutputFile(path: string, content: string): void {
    this.outputFiles.push(createOutputFileFromText(path, content));
  }

  get output() {
    return {
      success: this.outputFiles.length > 0,
    };
  }

  get outputWithFiles() {
    return {
      success: this.outputFiles.length > 0,
      outputFiles: this.outputFiles,
      assetFiles: this.assetFiles,
    };
  }

  get watchFiles() {
    const files = this.rebuildContexts.flatMap((context) => [...context.watchFiles]);
    if (this.codeBundleCache?.referencedFiles) {
      files.push(...this.codeBundleCache.referencedFiles);
    }

    return files;
  }

  createRebuildState(fileChanges: ChangedFiles): RebuildState {
    this.codeBundleCache?.invalidate([...fileChanges.modified, ...fileChanges.removed]);

    return {
      rebuildContexts: this.rebuildContexts,
      codeBundleCache: this.codeBundleCache,
      fileChanges,
    };
  }

  async dispose(): Promise<void> {
    await Promise.allSettled(this.rebuildContexts.map((context) => context.dispose()));
  }
}
