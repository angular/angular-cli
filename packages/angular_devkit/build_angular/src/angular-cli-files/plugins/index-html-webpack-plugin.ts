/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { Compiler, compilation } from 'webpack';
import { FileInfo, augmentIndexHtml } from '../utilities/index-file/augment-index-html';

export interface IndexHtmlWebpackPluginOptions {
  input: string;
  output: string;
  baseHref?: string;
  entrypoints: string[];
  deployUrl?: string;
  sri: boolean;
  noModuleEntrypoints: string[];
}

function readFile(filename: string, compilation: compilation.Compilation): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    compilation.inputFileSystem.readFile(filename, (err: Error, data: Buffer) => {
      if (err) {
        reject(err);

        return;
      }

      let content;
      if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
        // Strip UTF-8 BOM
        content = data.toString('utf8', 3);
      } else if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
        // Strip UTF-16 LE BOM
        content = data.toString('utf16le', 2);
      } else {
        content = data.toString();
      }

      resolve(content);
    });
  });
}


export class IndexHtmlWebpackPlugin {
  private _options: IndexHtmlWebpackPluginOptions;

  constructor(options?: Partial<IndexHtmlWebpackPluginOptions>) {
    this._options = {
      input: 'index.html',
      output: 'index.html',
      entrypoints: ['polyfills', 'main'],
      noModuleEntrypoints: [],
      sri: false,
      ...options,
    };
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapPromise('index-html-webpack-plugin', async compilation => {
      // Get input html file
      const inputContent = await readFile(this._options.input, compilation);
      (compilation as compilation.Compilation & { fileDependencies: Set<string> })
        .fileDependencies.add(this._options.input);

      // Get all files for selected entrypoints
      const files: FileInfo[] = [];
      const noModuleFiles: FileInfo[] = [];

      for (const [entryName, entrypoint] of compilation.entrypoints) {
        const entryFiles: FileInfo[] = (entrypoint && entrypoint.getFiles() || [])
          .map((f: string): FileInfo => ({
            name: entryName,
            file: f,
            extension: path.extname(f),
          }));

        if (this._options.noModuleEntrypoints.includes(entryName)) {
          noModuleFiles.push(...entryFiles);
        } else {
          files.push(...entryFiles);
        }
      }

      const loadOutputFile = (name: string) => compilation.assets[name].source();
      const indexSource = await augmentIndexHtml({
        input: this._options.input,
        inputContent,
        baseHref: this._options.baseHref,
        deployUrl: this._options.deployUrl,
        sri: this._options.sri,
        files,
        noModuleFiles,
        loadOutputFile,
        entrypoints: this._options.entrypoints,
      });

      // Add to compilation assets
      compilation.assets[this._options.output] = indexSource;
    });
  }
}
