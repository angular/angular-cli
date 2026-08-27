/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import mergeSourceMaps, { type DecodedSourceMap, type RawSourceMap } from '@ampproject/remapping';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AsyncCompiler,
  CanonicalizeContext,
  CompileResult,
  FileImporter,
  Importer,
  NodePackageImporter,
  StringOptions,
} from 'sass-embedded';
import { useSassEmbedded } from '../../utils/environment-options';
import {
  AsyncModuleUrlRebasingImporter,
  DirectoryEntry,
  LoadPathsUrlRebasingImporter,
  RelativeUrlRebasingImporter,
} from './rebasing-importer';

type Importers =
  | Importer<'sync'>
  | Importer<'async'>
  | FileImporter<'sync'>
  | FileImporter<'async'>
  | NodePackageImporter;

function isFileImporter(value: Importers): value is FileImporter {
  return 'findFileUrl' in value;
}

/**
 * A Sass renderer implementation that uses the persistent Dart Sass embedded compiler
 * daemon (`sass-embedded`) communicating over standard input/output with protocol buffers,
 * or falls back to the pure-JS Dart Sass async compiler (`sass.initAsyncCompiler()`).
 */
export class SassCompiler {
  #asyncCompiler: AsyncCompiler | undefined;
  #asyncCompilerPromise: Promise<AsyncCompiler> | undefined;

  constructor(private readonly rebase = false) {}

  async #createAsyncCompiler(): Promise<AsyncCompiler> {
    if (useSassEmbedded) {
      const { initAsyncCompiler } = await import('sass-embedded');

      return initAsyncCompiler();
    }

    const { initAsyncCompiler } = await import('sass');

    return initAsyncCompiler() as unknown as Promise<AsyncCompiler>;
  }

  async #ensureAsyncCompiler(): Promise<AsyncCompiler> {
    if (this.#asyncCompiler) {
      return this.#asyncCompiler;
    }

    this.#asyncCompilerPromise ??= this.#createAsyncCompiler();

    try {
      this.#asyncCompiler = await this.#asyncCompilerPromise;
    } finally {
      this.#asyncCompilerPromise = undefined;
    }

    return this.#asyncCompiler;
  }

  /**
   * Provides information about the Sass implementation.
   * This mimics enough of the `sass-embedded` or `sass` value to be used with the `sass-loader`.
   */
  get info(): string {
    return useSassEmbedded ? 'sass-embedded\tasync-compiler' : 'dart-sass\tasync-compiler';
  }

  /**
   * The synchronous render function is not used by the `sass-loader`.
   */
  compileString(): never {
    throw new Error('Sass compileString is not supported.');
  }

  /**
   * Asynchronously request a Sass stylesheet to be rendered using the native embedded compiler
   * or the pure-JS async compiler fallback.
   *
   * @param source The contents to compile.
   * @param options The `sass` / `sass-embedded` options to use when rendering the stylesheet.
   */
  async compileStringAsync(
    source: string,
    options: StringOptions<'async'>,
  ): Promise<CompileResult> {
    // The CLI's configuration does not use or expose the ability to define custom Sass functions
    if (options.functions && Object.keys(options.functions).length > 0) {
      throw new Error('Sass custom functions are not supported.');
    }

    const compiler = await this.#ensureAsyncCompiler();

    if (!this.rebase) {
      return compiler.compileStringAsync(source, options);
    }

    const { functions, importers, importer, url, logger, ...serializableOptions } = options;

    let finalImporters:
      (Importer<'async'> | FileImporter<'async'> | NodePackageImporter)[] | undefined;
    let loadPaths = options.loadPaths;
    const entryDirectory = url ? dirname(fileURLToPath(url)) : process.cwd();
    const directoryCache = new Map<string, DirectoryEntry>();
    const rebaseSourceMaps = options.sourceMap ? new Map<string, DecodedSourceMap>() : undefined;

    if (importers?.length) {
      if (importers.some((i) => !isFileImporter(i))) {
        throw new Error('Only File Importers are supported.');
      }

      finalImporters = [
        new AsyncModuleUrlRebasingImporter(
          entryDirectory,
          directoryCache,
          rebaseSourceMaps,
          async (specifier: string, options: CanonicalizeContext): Promise<URL | null> => {
            for (const importer of importers) {
              const result = await (importer as FileImporter<'async'>).findFileUrl(
                specifier,
                options,
              );
              if (result) {
                return result;
              }
            }

            return null;
          },
        ),
      ];
    }

    if (loadPaths?.length) {
      finalImporters ??= [];
      finalImporters.push(
        new LoadPathsUrlRebasingImporter(
          entryDirectory,
          directoryCache,
          rebaseSourceMaps,
          loadPaths,
        ),
      );
      loadPaths = undefined;
    }

    const relativeImporter = new RelativeUrlRebasingImporter(
      entryDirectory,
      directoryCache,
      rebaseSourceMaps,
    );

    const result = await compiler.compileStringAsync(source, {
      ...serializableOptions,
      url,
      loadPaths,
      importers: finalImporters,
      importer: relativeImporter,
      logger,
    });

    if (result.sourceMap && rebaseSourceMaps?.size) {
      result.sourceMap = mergeSourceMaps(
        result.sourceMap as unknown as RawSourceMap,
        (file, context) => (file !== context.importer ? rebaseSourceMaps.get(file) : null),
      ) as unknown as typeof result.sourceMap;
    }

    return result;
  }

  /**
   * Shutdown the Sass compiler.
   * @returns A void promise that resolves when closing is complete.
   */
  async close(): Promise<void> {
    if (this.#asyncCompilerPromise) {
      try {
        await this.#ensureAsyncCompiler();
      } catch {
        // Ignore compiler initialization failures on shutdown
      }
    }

    if (this.#asyncCompiler) {
      const compiler = this.#asyncCompiler;
      this.#asyncCompiler = undefined;
      await compiler.dispose();
    }
  }
}
