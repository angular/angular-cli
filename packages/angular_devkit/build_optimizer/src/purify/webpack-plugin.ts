/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { Compiler, compilation } from 'webpack';
import { ReplaceSource } from 'webpack-sources';
import { purifyReplacements } from './purify';


interface Chunk {
  files: string[];
}

export class PurifyPlugin {
  constructor() { }
  public apply(compiler: Compiler): void {
    compiler.plugin('compilation', (compilation: compilation.Compilation) => {
      // Webpack 4 provides the same functionality as this plugin and TS transformer
      compilation.warnings.push('PurifyPlugin is deprecated and will be removed in 0.7.0.');

      compilation.plugin('optimize-chunk-assets', (chunks: Chunk[], callback: () => void) => {
        chunks.forEach((chunk: Chunk) => {
          chunk.files
            .filter((fileName: string) => fileName.endsWith('.js'))
            .forEach((fileName: string) => {
              const inserts = purifyReplacements(compilation.assets[fileName].source());

              if (inserts.length > 0) {
                const replaceSource = new ReplaceSource(compilation.assets[fileName], fileName);
                inserts.forEach((insert) => {
                  replaceSource.insert(insert.pos, insert.content);
                });
                compilation.assets[fileName] = replaceSource;
              }
            });
        });
        callback();
      });
    });
  }
}
