/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import { WorkerPool } from '../../utils/worker-pool';
import { BuildOutputFile, BuildOutputFileType } from './bundler-context';
import type { LmbdCacheStore } from './lmdb-cache-store';
import { createOutputFile } from './utils';

/**
 * A keyword used to indicate if a JavaScript file may require inlining of translations.
 * This keyword is used to avoid processing files that would not otherwise need i18n processing.
 */
const LOCALIZE_KEYWORD = '$localize';

/**
 * Inlining options that should apply to all transformed code.
 */
export interface I18nInlinerOptions {
  missingTranslation: 'error' | 'warning' | 'ignore';
  outputFiles: BuildOutputFile[];
  shouldOptimize?: boolean;
  persistentCachePath?: string;
}

/**
 * A class that performs i18n translation inlining of JavaScript code.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Inlining is only performed on code that contains the
 * localize function (`$localize`).
 */
export class I18nInliner {
  #cacheInitFailed = false;
  #workerPool: WorkerPool;
  #cache: LmbdCacheStore | undefined;
  readonly #localizeFiles: ReadonlyMap<string, BuildOutputFile>;
  readonly #unmodifiedFiles: Array<BuildOutputFile>;

  constructor(
    private readonly options: I18nInlinerOptions,
    maxThreads?: number,
  ) {
    this.#unmodifiedFiles = [];
    const { outputFiles, shouldOptimize, missingTranslation } = options;
    const files = new Map<string, BuildOutputFile>();

    const pendingMaps = [];
    for (const file of outputFiles) {
      if (file.type === BuildOutputFileType.Root || file.type === BuildOutputFileType.ServerRoot) {
        // Skip also the server entry-point.
        // Skip stats and similar files.
        continue;
      }

      const fileExtension = extname(file.path);
      if (fileExtension === '.js' || fileExtension === '.mjs') {
        // Check if localizations are present
        const contentBuffer = Buffer.isBuffer(file.contents)
          ? file.contents
          : Buffer.from(file.contents.buffer, file.contents.byteOffset, file.contents.byteLength);
        const hasLocalize = contentBuffer.includes(LOCALIZE_KEYWORD);

        if (hasLocalize) {
          files.set(file.path, file);

          continue;
        }
      } else if (fileExtension === '.map') {
        // The related JS file may not have been checked yet. To ensure that map files are not
        // missed, store any pending map files and check them after all output files.
        pendingMaps.push(file);
        continue;
      }

      this.#unmodifiedFiles.push(file);
    }

    // Check if any pending map files should be processed by checking if the parent JS file is present
    for (const file of pendingMaps) {
      if (files.has(file.path.slice(0, -4))) {
        files.set(file.path, file);
      } else {
        this.#unmodifiedFiles.push(file);
      }
    }

    this.#localizeFiles = files;

    this.#workerPool = new WorkerPool({
      filename: require.resolve('./i18n-inliner-worker'),
      maxThreads,
      // Extract options to ensure only the named options are serialized and sent to the worker
      workerData: {
        missingTranslation,
        shouldOptimize,
        // A Blob is an immutable data structure that allows sharing the data between workers
        // without copying until the data is actually used within a Worker. This is useful here
        // since each file may not actually be processed in each Worker and the Blob avoids
        // unneeded repeat copying of potentially large JavaScript files.
        files: new Map<string, Blob>(
          Array.from(files, ([name, file]) => [name, new Blob([file.contents])]),
        ),
      },
    });
  }

  /**
   * Performs inlining of translations for the provided locale and translations. The files that
   * are processed originate from the files passed to the class constructor and filter by presence
   * of the localize function keyword.
   * @param locale The string representing the locale to inline.
   * @param translation The translation messages to use when inlining.
   * @returns A promise that resolves to an array of OutputFiles representing a translated result.
   */
  async inlineForLocale(
    locale: string,
    translation: Record<string, unknown> | undefined,
  ): Promise<{ outputFiles: BuildOutputFile[]; errors: string[]; warnings: string[] }> {
    await this.initCache();

    const { shouldOptimize, missingTranslation } = this.options;
    // Request inlining for each file that contains localize calls
    const requests = [];

    let fileCacheKeyBase: Uint8Array | undefined;

    for (const [filename, file] of this.#localizeFiles) {
      let cacheKey: string | undefined;
      if (filename.endsWith('.map')) {
        continue;
      }

      let cacheResultPromise = Promise.resolve(null);
      if (this.#cache) {
        fileCacheKeyBase ??= Buffer.from(
          JSON.stringify({ locale, translation, missingTranslation, shouldOptimize }),
          'utf-8',
        );

        // NOTE: If additional options are added, this may need to be updated.
        // TODO: Consider xxhash or similar instead of SHA256
        cacheKey = createHash('sha256')
          .update(file.hash)
          .update(filename)
          .update(fileCacheKeyBase)
          .digest('hex');

        // Failure to get the value should not fail the transform
        cacheResultPromise = this.#cache.get(cacheKey).catch(() => null);
      }

      const fileResult = cacheResultPromise.then(async (cachedResult) => {
        if (cachedResult) {
          return cachedResult;
        }

        const result = await this.#workerPool.run({ filename, locale, translation });
        if (this.#cache && cacheKey) {
          // Failure to set the value should not fail the transform
          await this.#cache.set(cacheKey, result).catch(() => {});
        }

        return result;
      });

      requests.push(fileResult);
    }

    // Wait for all file requests to complete
    const rawResults = await Promise.all(requests);

    // Convert raw results to output file objects and include all unmodified files
    const errors: string[] = [];
    const warnings: string[] = [];
    const outputFiles = [
      ...rawResults.flatMap(({ file, code, map, messages }) => {
        const type = this.#localizeFiles.get(file)?.type;
        assert(type !== undefined, 'localized file should always have a type' + file);

        const resultFiles = [createOutputFile(file, code, type)];
        if (map) {
          resultFiles.push(createOutputFile(file + '.map', map, type));
        }

        for (const message of messages) {
          if (message.type === 'error') {
            errors.push(message.message);
          } else {
            warnings.push(message.message);
          }
        }

        return resultFiles;
      }),
      ...this.#unmodifiedFiles.map((file) => file.clone()),
    ];

    return {
      outputFiles,
      errors,
      warnings,
    };
  }

  /**
   * Stops all active transformation tasks and shuts down all workers.
   * @returns A void promise that resolves when closing is complete.
   */
  close(): Promise<void> {
    return this.#workerPool.destroy();
  }

  /**
   * Initializes the cache for storing translated bundles.
   * If the cache is already initialized, it does nothing.
   *
   * @returns A promise that resolves once the cache initialization process is complete.
   */
  private async initCache(): Promise<void> {
    if (this.#cache || this.#cacheInitFailed) {
      return;
    }

    const { persistentCachePath } = this.options;
    // Webcontainers currently do not support this persistent cache store.
    if (!persistentCachePath || process.versions.webcontainer) {
      return;
    }

    // Initialize a persistent cache for i18n transformations.
    try {
      const { LmbdCacheStore } = await import('./lmdb-cache-store');

      this.#cache = new LmbdCacheStore(join(persistentCachePath, 'angular-i18n.db'));
    } catch {
      this.#cacheInitFailed = true;

      // eslint-disable-next-line no-console
      console.warn(
        'Unable to initialize JavaScript cache storage.\n' +
          'This will not affect the build output content but may result in slower builds.',
      );
    }
  }
}
