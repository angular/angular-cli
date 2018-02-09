/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler } from 'webpack';
import { RawSource, SourceMapSource } from 'webpack-sources';

const CleanCSS = require('clean-css');

interface Chunk {
  files: string[];
}

export interface CleanCssWebpackPluginOptions {
  sourceMap: boolean;
  test: (file: string) => boolean;
}

export class CleanCssWebpackPlugin {
  private readonly _options: CleanCssWebpackPluginOptions;

  constructor(options: Partial<CleanCssWebpackPluginOptions>) {
    this._options = {
      sourceMap: false,
      test: (file) => file.endsWith('.css'),
      ...options,
    };
  }

  apply(compiler: Compiler): void {
    compiler.plugin('compilation', (compilation: any) => {
      compilation.plugin('optimize-chunk-assets',
      (chunks: Array<Chunk>, callback: (err?: Error) => void) => {

        const cleancss = new CleanCSS({
          compatibility: 'ie9',
          level: 2,
          inline: false,
          returnPromise: true,
          sourceMap: this._options.sourceMap,
        });

        const files: string[] = [...compilation.additionalChunkAssets];

        chunks.forEach(chunk => {
          if (chunk.files && chunk.files.length > 0) {
            files.push(...chunk.files);
          }
        });

        const actions = files
          .filter(file => this._options.test(file))
          .map(file => {
            const asset = compilation.assets[file];
            if (!asset) {
              return Promise.resolve();
            }

            let content: string;
            let map: any;
            if (asset.sourceAndMap) {
              const sourceAndMap = asset.sourceAndMap();
              content = sourceAndMap.source;
              map = sourceAndMap.map;
            } else {
              content = asset.source();
            }

            if (content.length === 0) {
              return Promise.resolve();
            }

            return Promise.resolve()
              .then(() => cleancss.minify(content, map))
              .then((output: any) => {
                let hasWarnings = false;
                if (output.warnings && output.warnings.length > 0) {
                  compilation.warnings.push(...output.warnings);
                  hasWarnings = true;
                }

                if (output.errors && output.errors.length > 0) {
                  output.errors
                    .forEach((error: string) => compilation.errors.push(new Error(error)));
                  return;
                }

                // generally means invalid syntax so bail
                if (hasWarnings && output.stats.minifiedSize === 0) {
                  return;
                }

                let newSource;
                if (output.sourceMap) {
                  newSource = new SourceMapSource(
                    output.styles,
                    file,
                    output.sourceMap.toString(),
                    content,
                    map,
                  );
                } else {
                  newSource = new RawSource(output.styles);
                }

                compilation.assets[file] = newSource;
              });
          });

        Promise.all(actions)
          .then(() => callback())
          .catch(err => callback(err));
      });
    });
  }
}
