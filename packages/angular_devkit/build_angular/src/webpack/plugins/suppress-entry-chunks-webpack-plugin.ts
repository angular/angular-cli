/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Remove .js files from entry points consisting entirely of stylesheets.
 * To be used together with mini-css-extract-plugin.
 */
export class SuppressExtractedTextChunksWebpackPlugin {
  apply(compiler: import('webpack').Compiler): void {
    compiler.hooks.compilation.tap('SuppressExtractedTextChunks', (compilation) => {
      compilation.hooks.chunkAsset.tap('SuppressExtractedTextChunks', (chunk, filename) => {
        // Remove only JavaScript assets
        if (!filename.endsWith('.js')) {
          return;
        }

        // Only chunks with a css asset should have JavaScript assets removed
        let hasCssFile = false;
        for (const file of chunk.files) {
          if (file.endsWith('.css')) {
            hasCssFile = true;
            break;
          }
        }

        if (!hasCssFile) {
          return;
        }

        // Only chunks with all CSS entry dependencies should have JavaScript assets removed
        let cssOnly = false;
        const entryModules = compilation.chunkGraph.getChunkEntryModulesIterable(chunk);
        for (const module of entryModules) {
          cssOnly = module.dependencies.every(
            (dependency: {}) => dependency.constructor.name === 'CssDependency',
          );

          if (!cssOnly) {
            break;
          }
        }

        if (cssOnly) {
          chunk.files.delete(filename);
          compilation.deleteAsset(filename);
        }
      });
    });
  }
}
