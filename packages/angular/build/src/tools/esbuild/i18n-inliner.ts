/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { extname, join } from 'node:path';
import { serialize } from 'node:v8';
import { calculateHash, createContentHash, initializeHash } from '../../utils/hash';
import { WorkerPool } from '../../utils/worker-pool';
import { type BuildOutputFile, BuildOutputFileType, createOutputFile } from './bundler-files';
import { type Cache, type PersistentCacheStore, createPersistentCacheStore } from './cache';
import { encodeTranslationToBuffer } from './i18n-translation-encoder';

/**
 * A keyword used to indicate if a JavaScript file may require inlining of translations.
 * This keyword is used to avoid processing files that would not otherwise need i18n processing.
 */
const LOCALIZE_KEYWORD = '$localize';

/**
 * The maximum number of locales to process concurrently in a single sliding window.
 * This caps peak worker memory while maintaining multi-locale batching throughput.
 */
const DEFAULT_LOCALE_WINDOW_SIZE = 8;

/**
 * Serializes the translation messages for a locale for transfer to an inliner Worker.
 *
 * A SharedArrayBuffer is preferred because it enables zero-copy shared memory access
 * and on-demand string decoding across all worker threads. Falls back to a Blob when
 * SharedArrayBuffer is unavailable.
 *
 * @param translation The translation messages for a locale, if the locale has any.
 * @returns A SharedArrayBuffer or Blob containing the serialized messages, or undefined if none.
 */
function serializeTranslation(
  translation: Record<string, unknown> | undefined,
): SharedArrayBuffer | Blob | undefined {
  if (!translation) {
    return undefined;
  }

  if (typeof SharedArrayBuffer !== 'undefined') {
    return encodeTranslationToBuffer(translation);
  }

  return new Blob([serialize(translation)]);
}

/**
 * Inlining options that should apply to all transformed code.
 */
export interface I18nInlinerOptions {
  missingTranslation: 'error' | 'warning' | 'ignore';
  outputFiles: BuildOutputFile[];
  shouldOptimize?: boolean;
  persistentCachePath?: string;
  localizeVersion?: string;
  translations?: ReadonlyMap<string, Blob | SharedArrayBuffer>;
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
  translation?: Record<string, unknown>;

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
  code: string;
  map?: string;
  messages: { type: 'error' | 'warning'; message: string }[];
}

/**
 * Represents an in-flight asynchronous cache lookup for a single (file x locale) transformation.
 */
interface CacheCheckItem {
  /**
   * The relative file path of the JavaScript file to transform.
   */
  filename: string;

  /**
   * The locale specifier being targeted for translation.
   */
  locale: string;

  /**
   * The computed cache key hash, or undefined if persistent caching is not configured.
   */
  cacheKey: string | undefined;

  /**
   * A promise that resolves to the cached transform result, or null if uncached or on lookup failure.
   */
  cachedResult: Promise<TransformedFileResult | null>;
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
  #cache: Cache<TransformedFileResult> | undefined;
  readonly #localizeFiles: ReadonlyMap<string, BuildOutputFile>;
  readonly #unmodifiedFiles: Array<BuildOutputFile>;

  constructor(
    private readonly options: I18nInlinerOptions,
    maxThreads?: number,
  ) {
    this.#unmodifiedFiles = [];
    const { outputFiles, shouldOptimize, missingTranslation, translations } = options;
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
        translations,
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
   * Performs inlining of translations across multiple locales in parallel.
   *
   * An adaptive 2D task-partitioning algorithm distributes (files x locales) work units
   * across all worker threads while caching AST metadata and sourcemaps in worker memory.
   *
   * @param locales The locales and translations to inline.
   * @returns A map of locale names to their inlined output files and diagnostics.
   */
  async inlineAll(
    locales: Iterable<LocaleInlineOptions>,
  ): Promise<Map<string, LocaleInlineResult>> {
    await this.initCache();

    const { shouldOptimize, missingTranslation, localizeVersion } = this.options;
    const localeList = Array.from(locales);

    if (localeList.length === 0) {
      return new Map();
    }

    const fileResultsByLocale = new Map<string, Map<string, TransformedFileResult>>();
    for (const { locale } of localeList) {
      fileResultsByLocale.set(locale, new Map());
    }

    const filenames = Array.from(this.#localizeFiles.keys()).filter(
      (name) => !name.endsWith('.map'),
    );

    // Process locales in sliding windows to cap peak worker memory
    for (let i = 0; i < localeList.length; i += DEFAULT_LOCALE_WINDOW_SIZE) {
      const windowLocales = localeList.slice(i, i + DEFAULT_LOCALE_WINDOW_SIZE);
      const activeLocales = windowLocales.map((item) => item.locale);
      const isLastWindow = i + DEFAULT_LOCALE_WINDOW_SIZE >= localeList.length;

      // Pre-calculate cache key bases and serialized Blobs for each locale in this window
      const localeCacheBases = new Map<string, string>();
      const localeBlobs = new Map<string, Blob | SharedArrayBuffer | undefined>();

      for (const { locale, translation, translationIntegrity } of windowLocales) {
        localeBlobs.set(locale, serializeTranslation(translation));

        if (this.#cacheStore) {
          localeCacheBases.set(
            locale,
            calculateHash(
              JSON.stringify({
                locale,
                translation: translationIntegrity || translation,
                missingTranslation,
                shouldOptimize,
                localizeVersion,
              }),
            ),
          );
        }
      }

      const cacheChecks: CacheCheckItem[] = [];

      for (const filename of filenames) {
        const file = this.#localizeFiles.get(filename);
        assert(file !== undefined, 'Localize file must exist: ' + filename);

        for (const { locale } of windowLocales) {
          let cacheKey: string | undefined;
          let cachedResultPromise: Promise<TransformedFileResult | null> = Promise.resolve(null);

          if (this.#cache) {
            const fileCacheKeyBase = localeCacheBases.get(locale);
            assert(fileCacheKeyBase !== undefined, 'Cache base must exist for locale: ' + locale);

            const hasher = createContentHash();
            hasher.update(file.hash);
            hasher.update(filename);
            hasher.update(fileCacheKeyBase);
            cacheKey = hasher.digest();

            cachedResultPromise = this.#cache
              .get(cacheKey)
              .then((val) => val ?? null)
              .catch(() => null);
          }

          cacheChecks.push({
            filename,
            locale,
            cacheKey,
            cachedResult: cachedResultPromise,
          });
        }
      }

      // Await all cache checks for this window
      const resolvedChecks = await Promise.all(
        cacheChecks.map(async (item) => ({
          ...item,
          result: await item.cachedResult,
        })),
      );

      // Group uncached items by filename for this window
      const uncachedByFile = new Map<string, UncachedLocaleEntry[]>();

      for (const item of resolvedChecks) {
        if (item.result) {
          // Cache hit: store directly in locale file results
          fileResultsByLocale.get(item.locale)?.set(item.filename, item.result);
        } else {
          // Cache miss: needs worker processing
          let fileEntries = uncachedByFile.get(item.filename);
          if (!fileEntries) {
            fileEntries = [];
            uncachedByFile.set(item.filename, fileEntries);
          }
          fileEntries.push({
            locale: item.locale,
            cacheKey: item.cacheKey,
            translation: localeBlobs.get(item.locale),
          });
        }
      }

      // Adaptive 2D Sharding for uncached tasks in this window
      if (uncachedByFile.size > 0) {
        await this.#processUncachedBatches(
          uncachedByFile,
          windowLocales.length,
          fileResultsByLocale,
          activeLocales,
          isLastWindow,
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
          const fileResult = fileResults.get(filename);
          if (!fileResult) {
            continue;
          }

          const type = this.#localizeFiles.get(filename)?.type;
          assert(type !== undefined, 'localized file should always have a type: ' + filename);

          outputFiles.push(createOutputFile(filename, fileResult.code, type));
          if (fileResult.map) {
            outputFiles.push(createOutputFile(filename + '.map', fileResult.map, type));
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
      outputFiles.push(...this.#unmodifiedFiles.map((file) => file.clone()));

      resultsByLocale.set(locale, {
        outputFiles,
        errors,
        warnings,
      });
    }

    return resultsByLocale;
  }

  async #processUncachedBatches(
    uncachedByFile: Map<string, UncachedLocaleEntry[]>,
    localeCount: number,
    fileResultsByLocale: Map<string, Map<string, TransformedFileResult>>,
    activeLocales?: string[],
    isLastWindow = true,
  ): Promise<void> {
    const workerCount = this.#workerPool.maxThreads || 1;
    const targetTaskCount = Math.max(uncachedByFile.size, workerCount * 2);
    const localesPerBatch = Math.max(
      1,
      Math.ceil(localeCount / (targetTaskCount / (uncachedByFile.size || 1))),
    );

    const workerTasks: Promise<void>[] = [];

    for (const [filename, entries] of uncachedByFile) {
      const ephemeral = isLastWindow && entries.length <= localesPerBatch;
      for (let i = 0; i < entries.length; i += localesPerBatch) {
        const batchEntries = entries.slice(i, i + localesPerBatch);
        const task = (async () => {
          const batchResult = (await this.#workerPool.run(
            {
              filename,
              locales: batchEntries.map((e) => ({
                locale: e.locale,
                translation: e.translation,
              })),
              ephemeral,
              activeLocales,
            },
            { name: 'inlineFileBatch' },
          )) as {
            file: string;
            results: Array<TransformedFileResult & { locale: string }>;
          };

          const cachePromises: Promise<unknown>[] = [];
          for (const res of batchResult.results) {
            const matchingEntry = batchEntries.find((e) => e.locale === res.locale);
            const cacheKey = matchingEntry?.cacheKey;

            if (this.#cache && cacheKey) {
              cachePromises.push(
                this.#cache.put(cacheKey, {
                  file: filename,
                  code: res.code,
                  map: res.map,
                  messages: res.messages,
                }),
              );
            }

            fileResultsByLocale.get(res.locale)?.set(filename, res);
          }
          await Promise.allSettled(cachePromises);
        })();

        workerTasks.push(task);
      }
    }

    await Promise.all(workerTasks);
  }

  /**
   * Performs inlining of translations for the provided locale and translations. The files that
   * are processed originate from the files passed to the class constructor and filter by presence
   * of the localize function keyword.
   * @param locale The string representing the locale to inline.
   * @param translation The translation messages to use when inlining.
   * @param translationIntegrity An optional integrity value for the translation messages to use for caching.
   * @returns A promise that resolves to an array of OutputFiles representing a translated result.
   */
  async inlineForLocale(
    locale: string,
    translation: Record<string, unknown> | undefined,
    translationIntegrity?: string,
  ): Promise<LocaleInlineResult> {
    const results = await this.inlineAll([{ locale, translation, translationIntegrity }]);
    const result = results.get(locale);
    assert(result !== undefined, `Result for locale '${locale}' should be present.`);

    return result;
  }

  async inlineTemplateUpdate(
    locale: string,
    translation: Record<string, unknown> | undefined,
    templateCode: string,
    templateId: string,
  ): Promise<{ code: string; errors: string[]; warnings: string[] }> {
    const hasLocalize = templateCode.includes(LOCALIZE_KEYWORD);

    if (!hasLocalize) {
      return {
        code: templateCode,
        errors: [],
        warnings: [],
      };
    }

    const { output, messages } = await this.#workerPool.run(
      {
        code: templateCode,
        filename: templateId,
        locale,
        translation: serializeTranslation(translation),
      },
      { name: 'inlineCode' },
    );

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
      this.#cache = cacheStore.createCache('transforms');
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
