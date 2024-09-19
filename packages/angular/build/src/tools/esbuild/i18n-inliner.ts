/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { WorkerPool } from '../../utils/worker-pool';
import { BuildOutputFile, BuildOutputFileType } from './bundler-context';
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
}

/**
 * A class that performs i18n translation inlining of JavaScript code.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Inlining is only performed on code that contains the
 * localize function (`$localize`).
 */
export class I18nInliner {
  #workerPool: WorkerPool;
  readonly #localizeFiles: ReadonlyMap<string, Blob>;
  readonly #unmodifiedFiles: Array<BuildOutputFile>;
  readonly #fileToType = new Map<string, BuildOutputFileType>();

  constructor(options: I18nInlinerOptions, maxThreads?: number) {
    this.#unmodifiedFiles = [];

    const files = new Map<string, Blob>();
    const pendingMaps = [];
    for (const file of options.outputFiles) {
      if (file.type === BuildOutputFileType.Root || file.type === BuildOutputFileType.ServerRoot) {
        // Skip also the server entry-point.
        // Skip stats and similar files.
        continue;
      }

      this.#fileToType.set(file.path, file.type);

      if (file.path.endsWith('.js') || file.path.endsWith('.mjs')) {
        // Check if localizations are present
        const contentBuffer = Buffer.isBuffer(file.contents)
          ? file.contents
          : Buffer.from(file.contents.buffer, file.contents.byteOffset, file.contents.byteLength);
        const hasLocalize = contentBuffer.includes(LOCALIZE_KEYWORD);

        if (hasLocalize) {
          // A Blob is an immutable data structure that allows sharing the data between workers
          // without copying until the data is actually used within a Worker. This is useful here
          // since each file may not actually be processed in each Worker and the Blob avoids
          // unneeded repeat copying of potentially large JavaScript files.
          files.set(file.path, new Blob([file.contents]));

          continue;
        }
      } else if (file.path.endsWith('.js.map')) {
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
        files.set(file.path, new Blob([file.contents]));
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
        missingTranslation: options.missingTranslation,
        shouldOptimize: options.shouldOptimize,
        files,
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
    // Request inlining for each file that contains localize calls
    const requests = [];
    for (const filename of this.#localizeFiles.keys()) {
      if (filename.endsWith('.map')) {
        continue;
      }

      const fileRequest = this.#workerPool.run({
        filename,
        locale,
        translation,
      });
      requests.push(fileRequest);
    }

    // Wait for all file requests to complete
    const rawResults = await Promise.all(requests);

    // Convert raw results to output file objects and include all unmodified files
    const errors: string[] = [];
    const warnings: string[] = [];
    const outputFiles = [
      ...rawResults.flatMap(({ file, code, map, messages }) => {
        const type = this.#fileToType.get(file);
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
}
