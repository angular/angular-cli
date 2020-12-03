/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { Compiler, compilation } from 'webpack';
import { RawSource } from 'webpack-sources';
import { FileInfo } from '../../utils/index-file/augment-index-html';
import { IndexHtmlGenerator, IndexHtmlGeneratorOptions, IndexHtmlGeneratorProcessOptions } from '../../utils/index-file/index-html-generator';

export interface IndexHtmlWebpackPluginOptions extends IndexHtmlGeneratorOptions,
  Omit<IndexHtmlGeneratorProcessOptions, 'files' | 'noModuleFiles' | 'moduleFiles'> {
  noModuleEntrypoints: string[];
  moduleEntrypoints: string[];
}

export class IndexHtmlWebpackPlugin extends IndexHtmlGenerator {
  private _compilation: compilation.Compilation | undefined;
  get compilation(): compilation.Compilation {
    if (this._compilation) {
      return this._compilation;
    }

    throw new Error('compilation is undefined.');
  }

  constructor(readonly options: IndexHtmlWebpackPluginOptions) {
    super(options);
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapPromise('index-html-webpack-plugin', async compilation => {
      this._compilation = compilation;

      // Get all files for selected entrypoints
      const files: FileInfo[] = [];
      const noModuleFiles: FileInfo[] = [];
      const moduleFiles: FileInfo[] = [];

      for (const [entryName, entrypoint] of compilation.entrypoints) {
        const entryFiles: FileInfo[] = entrypoint?.getFiles()?.map(
          (f: string): FileInfo => ({
            name: entryName,
            file: f,
            extension: path.extname(f),
          }),
        );

        if (!entryFiles) {
          continue;
        }

        if (this.options.noModuleEntrypoints.includes(entryName)) {
          noModuleFiles.push(...entryFiles);
        } else if (this.options.moduleEntrypoints.includes(entryName)) {
          moduleFiles.push(...entryFiles);
        } else {
          files.push(...entryFiles);
        }
      }

      const content = await this.process({
        files,
        noModuleFiles,
        moduleFiles,
        outputPath: this.options.outputPath,
        baseHref: this.options.baseHref,
        lang: this.options.lang,
      });

      compilation.assets[this.options.outputPath] = new RawSource(content);
    });
  }

  async readAsset(path: string): Promise<string> {
    const data = this.compilation.assets[path].source();

    return typeof data === 'string' ? data : data.toString();
  }

  protected async readIndex(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.compilation.inputFileSystem.readFile(path, (err: Error, data: Buffer) => {
        if (err) {
          reject(err);

          return;
        }

        this.compilation.fileDependencies.add(path);
        resolve(data.toString());
      });
    });
  }
}
