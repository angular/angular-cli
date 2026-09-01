/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵParsedTranslation } from '@angular/localize';
import assert from 'node:assert';
import { extname, join } from 'node:path';
import { serialize } from 'node:v8';
import { calculateHash, createContentHash, initializeHash } from '../../utils/hash';
import { WorkerPool } from '../../utils/worker-pool';
import { type BuildOutputFile, BuildOutputFileType, createOutputFile } from './bundler-files';
import { type Cache, type PersistentCacheStore, createPersistentCacheStore } from './cache';
import type {
  InlineCodeRequest,
  InlineCodeResult,
  InlineFileBatchRequest,
  InlineFileBatchResult,
} from './i18n-inliner-worker';
import { encodeTranslationToBuffer } from './i18n-translation-encoder';

interface WorkerTaskMap {
  inlineFileBatch: {
    request: InlineFileBatchRequest;
    result: InlineFileBatchResult;
  };
  inlineCode: {
    request: InlineCodeRequest;
    result: InlineCodeResult;
  };
}

/**
 * A keyword used to indicate if a JavaScript file may require inlining of translations.
 * This keyword is used to avoid processing files that would not otherwise need i18n processing.
 */
const LOCALIZE_KEYWORD = '$localize';

/**
 * The baseline number of locales to process concurrently in a single sliding window.
 * This caps peak worker memory on low-core machines while maintaining multi-locale batching throughput.
 */
const DEFAULT_LOCALE_WINDOW_SIZE = 8;

/**
 * Minimum byte size threshold for a file to be eligible for multi-batch sharding.
 * Files below this threshold (< 100 KB) are processed in a single batch to minimize IPC overhead.
 */
const SMALL_FILE_FLOOR_BYTES = 100 * 1024;

/**
 * Ratio of the maximum file size in a window to consider a file "dominant".
 * Files within 70% of the largest file are sharded across all workers for maximum concurrency.
 */
const DOMINANT_FILE_RATIO = 0.7;

/**
 * Serializes the translation messages for a locale for transfer to an inliner Worker.
 *
 * A SharedArrayBuffer is preferred because it enables zero-copy shared memory access
 * and on-demand string decoding across all worker threads. Falls back to a Blob when
 * SharedArrayBuffer is unavailable.
 *
 * @param translation The translation messages for a locale, if the locale has any.
 * @param translationIntegrity Optional content hash of the translation file for cache lookup.
 * @param translationCache Optional Cache instance for binary translation buffers.
 * @returns A SharedArrayBuffer or Blob containing the serialized messages, or undefined if none.
 */
async function serializeTranslation(
  translation: Record<string, ɵParsedTranslation> | undefined,
  translationIntegrity?: string,
  translationCache?: Cache<Uint8Array>,
): Promise<SharedArrayBuffer | Blob | undefined> {
  if (!translation) {
    return undefined;
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    if (translationIntegrity && translationCache) {
      // Look up or generate binary translation data in the persistent cache.
      // A Uint8Array view is stored in the cache store to allow binary persistence.
      const binaryData = await translationCache.getOrCreate(translationIntegrity, () => {
        return new Uint8Array(encodeTranslationToBuffer(translation));
      });

      // On a cache miss, getOrCreate returns the newly created Uint8Array backed by the
      // original SharedArrayBuffer. Return it directly to avoid an unnecessary allocation and copy.
      if (
        binaryData.buffer instanceof SharedArrayBuffer &&
        binaryData.byteOffset === 0 &&
        binaryData.byteLength === binaryData.buffer.byteLength
      ) {
        return binaryData.buffer;
      }

      // On a warm cache hit, the restored data is backed by a standard ArrayBuffer from disk.
      // Copy it into a SharedArrayBuffer so worker threads can access it via zero-copy shared memory.
      const buffer = new SharedArrayBuffer(binaryData.byteLength);
      new Uint8Array(buffer).set(binaryData);

      return buffer;
    }

    // When persistent caching is not configured, encode directly into a SharedArrayBuffer.
    return encodeTranslationToBuffer(translation);
  }

  return new Blob([serialize(translation)]);
}

/**
 * Inlining options that should apply to all transformed code.
 */
export interface I18nInlinerOptions {
  missingTranslation: 'error' | 'warning' | 'ignore';
  persistentCachePath?: string;
  localizeVersion?: string;
}

/**
 * Options for inlining a specific locale.
 */
export interface LocaleInlineOptions {
  /**
   * The locale specifier string.
   */
  locale: string;

  /**
   * The translation messages for the locale, or undefined for the source/untranslated locale.
   */
  translation?: Record<string, ɵParsedTranslation>;

  /**
   * An optional content integrity hash of the translation file(s) for fast cache key calculation.
   */
  translationIntegrity?: string;
}

/**
 * Result of inlining for a specific locale.
 */
export interface LocaleInlineResult {
  outputFiles: BuildOutputFile[];
  errors: string[];
  warnings: string[];
}

/**
 * Transformation result for a single file and locale combination.
 */
interface TransformedFileResult {
  file: string;
  code?: string;
  map?: string;
  messages: { type: 'error' | 'warning'; message: string }[];
}

/**
 * An uncached transformation request entry for a file within a specific locale.
 */
interface UncachedLocaleEntry {
  locale: string;
  cacheKey?: string;
  translation?: Blob | SharedArrayBuffer;
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
  #cacheStore: PersistentCacheStore | undefined;
  #transformedFileCache: Cache<TransformedFileResult> | undefined;
  #translationCache: Cache<Uint8Array> | undefined;
  #generation = 0;

  constructor(
    private readonly options: I18nInlinerOptions,
    maxThreads?: number,
  ) {
    this.#workerPool = new WorkerPool({
      filename: require.resolve('./i18n-inliner-worker'),
      maxThreads,
    });
  }

  #partitionFiles(files: Iterable<BuildOutputFile>): {
    filenames: string[];
    localizeFiles: Map<string, BuildOutputFile>;
    localizeMaps: Map<string, BuildOutputFile>;
    unmodifiedFiles: BuildOutputFile[];
  } {
    const filenames: string[] = [];
    const localizeFiles = new Map<string, BuildOutputFile>();
    const localizeMaps = new Map<string, BuildOutputFile>();
    const unmodifiedFiles: BuildOutputFile[] = [];

    const pendingMaps: BuildOutputFile[] = [];
    for (const file of files) {
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
          localizeFiles.set(file.path, file);
          filenames.push(file.path);

          continue;
        }
      } else if (fileExtension === '.map') {
        // The related JS file may not have been checked yet. To ensure that map files are not
        // missed, store any pending map files and check them after all output files.
        pendingMaps.push(file);
        continue;
      }

      unmodifiedFiles.push(file);
    }

    // Check if any pending map files should be processed by checking if the parent JS file is present
    for (const file of pendingMaps) {
      const jsPath = file.path.slice(0, -4);
      if (localizeFiles.has(jsPath)) {
        localizeMaps.set(jsPath, file);
      } else {
        unmodifiedFiles.push(file);
      }
    }

    return { filenames, localizeFiles, localizeMaps, unmodifiedFiles };
  }

  /**
   * Performs inlining of translations across multiple locales in parallel.
   *
   * An adaptive 2D task-partitioning algorithm distributes (files x locales) work units
   * across all worker threads while caching AST metadata and sourcemaps in worker memory.
   *
   * @param files The build output files to transform.
   * @param locales The locales and translations to inline.
   * @returns A map of locale names to their inlined output files and diagnostics.
   */
  async inlineAll(
    files: Iterable<BuildOutputFile>,
    locales: Iterable<LocaleInlineOptions>,
  ): Promise<Map<string, LocaleInlineResult>> {
    await this.initCache();

    const generation = ++this.#generation;
    const { missingTranslation, localizeVersion } = this.options;
    const localeList = Array.from(locales);

    if (localeList.length === 0) {
      return new Map();
    }

    const { filenames, localizeFiles, localizeMaps, unmodifiedFiles } = this.#partitionFiles(files);

    const fileResultsByLocale = new Map<string, Map<string, TransformedFileResult>>();
    for (const { locale } of localeList) {
      assert(!fileResultsByLocale.has(locale), 'Duplicate locale provided to inliner: ' + locale);
      fileResultsByLocale.set(locale, new Map());
    }

    // Process locales in sliding windows to cap peak worker memory.
    // Ensure the window has at least enough locales to saturate all available workers on high-core machines.
    const windowSize = Math.max(DEFAULT_LOCALE_WINDOW_SIZE, this.#workerPool.maxThreads || 1);
    for (let i = 0; i < localeList.length; i += windowSize) {
      const windowLocales = localeList.slice(i, i + windowSize);
      const activeLocales = windowLocales.map((item) => item.locale);
      const isLastWindow = i + windowSize >= localeList.length;

      // Pre-calculate cache key bases and serialized Blobs for each locale in this window
      const localeCacheBases = new Map<string, string>();
      const localeBlobs = new Map<string, Blob | SharedArrayBuffer | undefined>();

      await Promise.all(
        windowLocales.map(async ({ locale, translation, translationIntegrity }) => {
          const serialized = await serializeTranslation(
            translation,
            translationIntegrity,
            this.#translationCache,
          );
          localeBlobs.set(locale, serialized);

          if (this.#cacheStore) {
            localeCacheBases.set(
              locale,
              calculateHash(
                JSON.stringify({
                  locale,
                  translation: translationIntegrity || translation,
                  missingTranslation,
                  localizeVersion,
                }),
              ),
            );
          }
        }),
      );

      const uncachedByFile = new Map<string, UncachedLocaleEntry[]>();

      if (this.#transformedFileCache) {
        const cache = this.#transformedFileCache;
        const cacheChecks: Promise<void>[] = [];

        for (const filename of filenames) {
          const file = localizeFiles.get(filename);
          assert(file !== undefined, 'Localize file must exist: ' + filename);

          const fileEntriesPromises = windowLocales.map(
            async ({ locale }): Promise<UncachedLocaleEntry | undefined> => {
              const fileCacheKeyBase = localeCacheBases.get(locale);
              assert(fileCacheKeyBase !== undefined, 'Cache base must exist for locale: ' + locale);

              const hasher = createContentHash();
              hasher.update(file.hash);
              hasher.update(filename);
              hasher.update(fileCacheKeyBase);
              const cacheKey = hasher.digest();

              try {
                const result = await cache.get(cacheKey);
                if (result) {
                  fileResultsByLocale.get(locale)?.set(filename, result);

                  return;
                }
              } catch {}

              return {
                locale,
                cacheKey,
                translation: localeBlobs.get(locale),
              };
            },
          );

          cacheChecks.push(
            Promise.all(fileEntriesPromises).then((entries) => {
              const filtered = entries.filter((e): e is UncachedLocaleEntry => e !== undefined);
              if (filtered.length > 0) {
                uncachedByFile.set(filename, filtered);
              }
            }),
          );
        }

        await Promise.all(cacheChecks);
      } else {
        for (const filename of filenames) {
          uncachedByFile.set(
            filename,
            windowLocales.map(({ locale }) => ({
              locale,
              translation: localeBlobs.get(locale),
            })),
          );
        }
      }

      // Adaptive 2D Sharding for uncached tasks in this window
      if (uncachedByFile.size > 0) {
        await this.#processUncachedBatches(
          localizeFiles,
          localizeMaps,
          uncachedByFile,
          fileResultsByLocale,
          activeLocales,
          isLastWindow,
          generation,
        );
      }
    }

    // Assemble final results in deterministic order per locale
    const resultsByLocale = new Map<string, LocaleInlineResult>();

    for (const { locale } of localeList) {
      const fileResults = fileResultsByLocale.get(locale);
      const outputFiles: BuildOutputFile[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      if (fileResults) {
        for (const filename of filenames) {
          const originalFile = localizeFiles.get(filename);
          assert(originalFile !== undefined, 'Localize file must exist: ' + filename);

          const fileResult = fileResults.get(filename);
          if (!fileResult) {
            continue;
          }

          const type = originalFile.type;
          if (fileResult.code != undefined) {
            outputFiles.push(createOutputFile(filename, fileResult.code, type));
          } else {
            outputFiles.push(originalFile.clone());
          }

          const originalMap = localizeMaps.get(filename);
          if (fileResult.map !== undefined) {
            outputFiles.push(createOutputFile(filename + '.map', fileResult.map, type));
          } else if (originalMap !== undefined) {
            outputFiles.push(originalMap.clone());
          }

          for (const message of fileResult.messages) {
            if (message.type === 'error') {
              errors.push(message.message);
            } else {
              warnings.push(message.message);
            }
          }
        }
      }

      // Include cloned unmodified files for every locale
      outputFiles.push(...unmodifiedFiles.map((file) => file.clone()));

      resultsByLocale.set(locale, {
        outputFiles,
        errors,
        warnings,
      });
    }

    return resultsByLocale;
  }

  async #processUncachedBatches(
    localizeFiles: Map<string, BuildOutputFile>,
    localizeMaps: Map<string, BuildOutputFile>,
    uncachedByFile: Map<string, UncachedLocaleEntry[]>,
    fileResultsByLocale: Map<string, Map<string, TransformedFileResult>>,
    activeLocales?: string[],
    isLastWindow = true,
    generation?: number,
  ): Promise<void> {
    const workerCount = this.#workerPool.maxThreads || 1;

    // Extract file data and identify the heaviest file size in a single pass
    let maxFileSize = 0;
    const sortedFiles = Array.from(uncachedByFile, ([filename, entries]) => {
      const codeFile = localizeFiles.get(filename);
      assert(codeFile !== undefined, 'Localize file must exist: ' + filename);
      const fileSize = codeFile.contents.byteLength;
      if (fileSize > maxFileSize) {
        maxFileSize = fileSize;
      }

      return { filename, entries, codeFile, fileSize };
    });

    // Sort files descending by byte size (Longest Processing Time First / LPT).
    // Heavy files (e.g. main.js) are queued first to saturate all worker threads immediately,
    // while small files act as gap fillers near the window barrier to prevent tail stragglers.
    sortedFiles.sort((a, b) => b.fileSize - a.fileSize);

    const workerTasks: Promise<void>[] = [];

    for (const { filename, entries, codeFile, fileSize } of sortedFiles) {
      const mapFile = localizeMaps.get(filename);
      const codeBlob = new Blob([codeFile.contents]);
      const mapBlob = mapFile ? new Blob([mapFile.contents]) : undefined;

      let localesPerBatch: number;
      if (uncachedByFile.size === 1) {
        // Single file in window: shard across all workers to avoid idle threads
        localesPerBatch = Math.max(1, Math.ceil(entries.length / workerCount));
      } else if (fileSize < SMALL_FILE_FLOOR_BYTES) {
        // Small chunks (< 100 KB): process all locales in 1 batch to eliminate IPC overhead
        localesPerBatch = entries.length;
      } else if (fileSize >= maxFileSize * DOMINANT_FILE_RATIO) {
        // Dominant file(s): shard across all workers for maximum multi-core parallelism
        localesPerBatch = Math.max(1, Math.ceil(entries.length / workerCount));
      } else {
        // Intermediate files: moderate sharding
        localesPerBatch = Math.max(1, Math.ceil(entries.length / 2));
      }

      const ephemeral = isLastWindow && entries.length <= localesPerBatch;
      for (let i = 0; i < entries.length; i += localesPerBatch) {
        const batchEntries = entries.slice(i, i + localesPerBatch);
        const task = (async () => {
          const batchResult = await this.#runWorkerTask('inlineFileBatch', {
            filename,
            code: codeBlob,
            map: mapBlob,
            locales: new Map(batchEntries.map((e) => [e.locale, e.translation])),
            missingTranslation: this.options.missingTranslation,
            ephemeral,
            activeLocales,
            generation,
          });

          if (batchResult.unmodified) {
            const unmodifiedResult: TransformedFileResult = {
              file: filename,
              messages: batchResult.messages,
            };

            const cachePromises: Promise<unknown>[] = [];
            for (const { locale, cacheKey } of batchEntries) {
              fileResultsByLocale.get(locale)?.set(filename, unmodifiedResult);

              if (this.#transformedFileCache && cacheKey) {
                cachePromises.push(this.#transformedFileCache.put(cacheKey, unmodifiedResult));
              }
            }
            await Promise.allSettled(cachePromises);
          } else {
            const cachePromises: Promise<unknown>[] = [];
            for (const res of batchResult.results) {
              const matchingEntry = batchEntries.find((e) => e.locale === res.locale);
              const cacheKey = matchingEntry?.cacheKey;
              const fileResult: TransformedFileResult = {
                file: filename,
                code: res.code,
                map: res.map,
                messages: res.messages,
              };

              if (this.#transformedFileCache && cacheKey) {
                cachePromises.push(this.#transformedFileCache.put(cacheKey, fileResult));
              }

              fileResultsByLocale.get(res.locale)?.set(filename, fileResult);
            }
            await Promise.allSettled(cachePromises);
          }
        })();

        workerTasks.push(task);
      }
    }

    await Promise.all(workerTasks);
  }

  #runWorkerTask<T extends keyof WorkerTaskMap>(
    name: T,
    request: WorkerTaskMap[T]['request'],
  ): Promise<WorkerTaskMap[T]['result']> {
    return this.#workerPool.run(request, { name }) as Promise<WorkerTaskMap[T]['result']>;
  }

  /**
   * Performs inlining of translations for the provided locale and translations.
   *
   * @param files The build output files to transform.
   * @param locale The string representing the locale to inline.
   * @param translation The translation messages to use when inlining.
   * @param translationIntegrity An optional integrity value for the translation messages to use for caching.
   * @returns A promise that resolves to an array of OutputFiles representing a translated result.
   */
  async inlineForLocale(
    files: Iterable<BuildOutputFile>,
    locale: string,
    translation: Record<string, ɵParsedTranslation> | undefined,
    translationIntegrity?: string,
  ): Promise<LocaleInlineResult> {
    const results = await this.inlineAll(files, [{ locale, translation, translationIntegrity }]);
    const result = results.get(locale);
    assert(result !== undefined, `Result for locale '${locale}' should be present.`);

    return result;
  }

  async inlineTemplateUpdate(
    locale: string,
    translation: Record<string, ɵParsedTranslation> | undefined,
    templateCode: string,
    templateId: string,
    translationIntegrity?: string,
  ): Promise<{ code: string; errors: string[]; warnings: string[] }> {
    const hasLocalize = templateCode.includes(LOCALIZE_KEYWORD);

    if (!hasLocalize) {
      return {
        code: templateCode,
        errors: [],
        warnings: [],
      };
    }

    const { output, messages } = await this.#runWorkerTask('inlineCode', {
      code: templateCode,
      filename: templateId,
      locale,
      missingTranslation: this.options.missingTranslation,
      translation: await serializeTranslation(
        translation,
        translationIntegrity,
        this.#translationCache,
      ),
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    for (const message of messages) {
      if (message.type === 'error') {
        errors.push(message.message);
      } else {
        warnings.push(message.message);
      }
    }

    return {
      code: output,
      errors,
      warnings,
    };
  }

  /**
   * Stops all active transformation tasks and shuts down all workers.
   * @returns A void promise that resolves when closing is complete.
   */
  async close(): Promise<void> {
    await Promise.allSettled([this.#cacheStore?.close(), this.#workerPool.destroy()]);
  }

  /**
   * Initializes the cache for storing translated bundles.
   * If the cache is already initialized, it does nothing.
   *
   * @returns A promise that resolves once the cache initialization process is complete.
   */
  private async initCache(): Promise<void> {
    if (this.#cacheStore || this.#cacheInitFailed) {
      return;
    }

    const { persistentCachePath } = this.options;
    // Webcontainers currently do not support this persistent cache store.
    if (!persistentCachePath || process.versions.webcontainer) {
      return;
    }

    // Initialize a persistent cache for i18n transformations.
    try {
      const [, cacheStore] = await Promise.all([
        initializeHash(),
        createPersistentCacheStore(join(persistentCachePath, 'angular-i18n')),
      ]);
      this.#cacheStore = cacheStore;
      this.#transformedFileCache = cacheStore.createCache('transforms');
      this.#translationCache = cacheStore.createCache('translations');
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
