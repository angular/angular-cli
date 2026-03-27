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
import type { LmdbCacheStore } from './lmdb-cache-store';
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
  #cache: LmdbCacheStore | undefined;
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

    // Build a map of old filename to new filename for files whose content changed
    // during inlining. This ensures output filenames reflect the actual inlined
    // content rather than using stale hashes from the pre-inlining esbuild build.
    // Without this, all localized files would share identical filenames across builds
    // even when their translated content differs, leading to browser caching issues.
    const filenameRenameMap = new Map<string, string>();

    // Regex to extract the hash portion from filenames like "chunk-HASH.js" or "name-HASH.js"
    const hashPattern = /^(.+)-([A-Z0-9]{8})(\.[a-z]+)$/;

    const inlinedFiles: Array<{
      file: string;
      code: string;
      map: string | undefined;
      type: BuildOutputFileType;
    }> = [];

    for (const { file, code, map, messages } of rawResults) {
      const type = this.#localizeFiles.get(file)?.type;
      assert(type !== undefined, 'localized file should always have a type' + file);

      for (const message of messages) {
        if (message.type === 'error') {
          errors.push(message.message);
        } else {
          warnings.push(message.message);
        }
      }

      // Check if the file content actually changed during inlining by comparing
      // the inlined code hash against the original file's hash.
      const originalFile = this.#localizeFiles.get(file);
      const originalHash = originalFile?.hash;
      const newContentHash = createHash('sha256').update(code).digest('hex');

      if (originalHash !== newContentHash) {
        // Content changed during inlining - compute a new filename hash
        const match = file.match(hashPattern);
        if (match) {
          const [, prefix, oldHash, ext] = match;
          // Generate a new 8-character uppercase alphanumeric hash from the inlined content.
          // Uses base-36 encoding to match esbuild's hash format (A-Z, 0-9).
          const hashBytes = createHash('sha256').update(code).digest();
          const hashValue = hashBytes.readBigUInt64BE(0);
          const newHash = hashValue.toString(36).slice(0, 8).toUpperCase().padStart(8, '0');
          if (oldHash !== newHash) {
            // Use the base filename (without directory) for replacement in file content
            const baseName = prefix.includes('/') ? prefix.slice(prefix.lastIndexOf('/') + 1) : prefix;
            const oldBaseName = `${baseName}-${oldHash}`;
            const newBaseName = `${baseName}-${newHash}`;
            filenameRenameMap.set(oldBaseName, newBaseName);
          }
        }
      }

      inlinedFiles.push({ file, code, map, type });
    }

    // Apply filename renames to file paths and content for all output files
    const outputFiles: BuildOutputFile[] = [];
    for (const { file, code, map, type } of inlinedFiles) {
      const updatedPath = applyFilenameRenames(file, filenameRenameMap);
      const updatedCode = applyFilenameRenames(code, filenameRenameMap);
      outputFiles.push(createOutputFile(updatedPath, updatedCode, type));
      if (map) {
        const updatedMap = applyFilenameRenames(map, filenameRenameMap);
        outputFiles.push(createOutputFile(updatedPath + '.map', updatedMap, type));
      }
    }

    // Also apply filename renames to unmodified files (they may reference renamed chunks)
    for (const file of this.#unmodifiedFiles) {
      const clone = file.clone();
      if (filenameRenameMap.size > 0) {
        const updatedPath = applyFilenameRenames(clone.path, filenameRenameMap);
        const updatedText = applyFilenameRenames(clone.text, filenameRenameMap);
        outputFiles.push(createOutputFile(updatedPath, updatedText, clone.type));
      } else {
        outputFiles.push(clone);
      }
    }

    return {
      outputFiles,
      errors,
      warnings,
    };
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
      { code: templateCode, filename: templateId, locale, translation },
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
      const { LmdbCacheStore } = await import('./lmdb-cache-store');

      this.#cache = new LmdbCacheStore(join(persistentCachePath, 'angular-i18n.db'));
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

/**
 * Applies filename renames to a string by replacing all occurrences of old filenames with new ones.
 * This is used to update file paths and file contents (e.g., dynamic import references like
 * `import("./chunk-OLDHASH.js")`) after i18n inlining has changed file content hashes.
 * Uses full base filenames (e.g., "chunk-ABCD1234") rather than bare hashes to minimize
 * the risk of accidental replacements in unrelated content.
 */
function applyFilenameRenames(content: string, renameMap: Map<string, string>): string {
  if (renameMap.size === 0) {
    return content;
  }

  for (const [oldName, newName] of renameMap) {
    content = content.replaceAll(oldName, newName);
  }

  return content;
}
