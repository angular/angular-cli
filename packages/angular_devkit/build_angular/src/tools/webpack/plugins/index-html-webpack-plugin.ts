/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  FileInfo,
  IndexHtmlGenerator,
  IndexHtmlGeneratorOptions,
  IndexHtmlGeneratorProcessOptions,
} from '@angular/build/private';
import { basename, dirname, extname } from 'node:path';
import { Compilation, Compiler, sources } from 'webpack';
import { assertIsError } from '../../../utils/error';
import { addError, addWarning } from '../../../utils/webpack-diagnostics';

export interface IndexHtmlWebpackPluginOptions
  extends IndexHtmlGeneratorOptions,
    Omit<IndexHtmlGeneratorProcessOptions, 'files'> {}

const PLUGIN_NAME = 'index-html-webpack-plugin';
export class IndexHtmlWebpackPlugin extends IndexHtmlGenerator {
  private _compilation: Compilation | undefined;
  get compilation(): Compilation {
    if (this._compilation) {
      return this._compilation;
    }

    throw new Error('compilation is undefined.');
  }

  constructor(override readonly options: IndexHtmlWebpackPluginOptions) {
    super(options);
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this._compilation = compilation;
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE + 1,
        },
        callback,
      );
    });

    const callback = async (assets: Record<string, unknown>) => {
      const files: FileInfo[] = [];

      try {
        for (const chunk of this.compilation.chunks) {
          for (const file of chunk.files) {
            // https://github.com/webpack/webpack/blob/1f99ad6367f2b8a6ef17cce0e058f7a67fb7db18/lib/config/defaults.js#L1000
            if (file.endsWith('.hot-update.js') || file.endsWith('.hot-update.mjs')) {
              continue;
            }

            files.push({
              name: chunk.name,
              file,
              extension: extname(file),
            });
          }
        }

        const {
          csrContent: content,
          warnings,
          errors,
        } = await this.process({
          files,
          outputPath: dirname(this.options.outputPath),
          baseHref: this.options.baseHref,
          lang: this.options.lang,
        });

        assets[this.options.outputPath] = new sources.RawSource(content);

        warnings.forEach((msg) => addWarning(this.compilation, msg));
        errors.forEach((msg) => addError(this.compilation, msg));
      } catch (error) {
        assertIsError(error);
        addError(this.compilation, error.message);
      }
    };
  }

  override async readAsset(path: string): Promise<string> {
    const data = this.compilation.assets[basename(path)].source();

    return typeof data === 'string' ? data : data.toString();
  }

  protected override async readIndex(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.compilation.inputFileSystem.readFile(
        path,
        (err?: Error | null, data?: string | Buffer) => {
          if (err) {
            reject(err);

            return;
          }

          this.compilation.fileDependencies.add(path);
          resolve(data?.toString() ?? '');
        },
      );
    });
  }
}
