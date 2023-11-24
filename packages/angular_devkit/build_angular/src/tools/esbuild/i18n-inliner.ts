/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Piscina from 'piscina';
import { BuildOutputFile, BuildOutputFileType } from './bundler-context';
import { createOutputFileFromText } from './utils';

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
  #workerPool: Piscina;
  readonly #localizeFiles: ReadonlyMap<string, Blob>;
  readonly #unmodifiedFiles: Array<BuildOutputFile>;
  readonly #fileToType = new Map<string, BuildOutputFileType>();

  constructor(options: I18nInlinerOptions, maxThreads?: number) {
    this.#unmodifiedFiles = [];

    const files = new Map<string, Blob>();
    const pendingMaps = [];
    for (const file of options.outputFiles) {
      if (file.type === BuildOutputFileType.Root) {
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

    this.#workerPool = new Piscina({
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
  ): Promise<BuildOutputFile[]> {
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
    return [
      ...rawResults.flat().map(({ file, contents }) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        createOutputFileFromText(file, contents, this.#fileToType.get(file)!),
      ),
      ...this.#unmodifiedFiles.map((file) => file.clone()),
    ];
  }

  /**
   * Stops all active transformation tasks and shuts down all workers.
   * @returns A void promise that resolves when closing is complete.
   */
  close(): Promise<void> {
    return this.#workerPool.destroy();
  }
}
