/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Piscina from 'piscina';

/**
 * Transformation options that should apply to all transformed files and data.
 */
export interface JavaScriptTransformerOptions {
  sourcemap: boolean;
  thirdPartySourcemaps?: boolean;
  advancedOptimizations?: boolean;
}

/**
 * A class that performs transformation of JavaScript files and raw data.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Transformation behavior is based on the filename and
 * data. Transformations may include: async downleveling, Angular linking,
 * and advanced optimizations.
 */
export class JavaScriptTransformer {
  #workerPool: Piscina;
  #commonOptions: Required<JavaScriptTransformerOptions>;

  constructor(options: JavaScriptTransformerOptions, maxThreads?: number) {
    this.#workerPool = new Piscina({
      filename: require.resolve('./javascript-transformer-worker'),
      maxThreads,
    });

    // Extract options to ensure only the named options are serialized and sent to the worker
    const { sourcemap, thirdPartySourcemaps = false, advancedOptimizations = false } = options;
    this.#commonOptions = {
      sourcemap,
      thirdPartySourcemaps,
      advancedOptimizations,
    };
  }

  /**
   * Performs JavaScript transformations on a file from the filesystem.
   * If no transformations are required, the data for the original file will be returned.
   * @param filename The full path to the file.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  transformFile(filename: string): Promise<Uint8Array> {
    // Always send the request to a worker. Files are almost always from node modules which measn
    // they may need linking. The data is also not yet available to perform most transformation checks.
    return this.#workerPool.run({
      filename,
      ...this.#commonOptions,
    });
  }

  /**
   * Performs JavaScript transformations on the provided data of a file. The file does not need
   * to exist on the filesystem.
   * @param filename The full path of the file represented by the data.
   * @param data The data of the file that should be transformed.
   * @param skipLinker If true, bypass all Angular linker processing; if false, attempt linking.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  async transformData(filename: string, data: string, skipLinker: boolean): Promise<Uint8Array> {
    // Perform a quick test to determine if the data needs any transformations.
    // This allows directly returning the data without the worker communication overhead.
    let forceAsyncTransformation;
    if (skipLinker && !this.#commonOptions.advancedOptimizations) {
      // If the linker is being skipped and no optimizations are needed, only async transformation is left.
      // This checks for async generator functions. All other async transformation is handled by esbuild.
      forceAsyncTransformation = data.includes('async') && /async\s+function\s*\*/.test(data);

      if (!forceAsyncTransformation) {
        return Buffer.from(data, 'utf-8');
      }
    }

    return this.#workerPool.run({
      filename,
      data,
      // Send the async check result if present to avoid rechecking in the worker
      forceAsyncTransformation,
      skipLinker,
      ...this.#commonOptions,
    });
  }

  /**
   * Stops all active transformation tasks and shuts down all workers.
   * @returns A void promise that resolves when closing is complete.
   */
  close(): Promise<void> {
    return this.#workerPool.destroy();
  }
}
