/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as cssNano from 'cssnano';
import { ProcessOptions, Result } from 'postcss';
import { Compiler, compilation } from 'webpack';
import { RawSource, Source, SourceMapSource } from 'webpack-sources';

export interface OptimizeCssWebpackPluginOptions {
  sourceMap: boolean;
  test: (file: string) => boolean;
}

function hook(
  compiler: Compiler,
  action: (
    compilation: compilation.Compilation,
    chunks: compilation.Chunk[],
  ) => Promise<void | void[]>,
) {
  compiler.hooks.compilation.tap(
    'optimize-css-webpack-plugin',
    (compilation: compilation.Compilation) => {
      compilation.hooks.optimizeChunkAssets.tapPromise('optimize-css-webpack-plugin', chunks =>
        action(compilation, chunks),
      );
    },
  );
}

export class OptimizeCssWebpackPlugin {
  private readonly _options: OptimizeCssWebpackPluginOptions;

  constructor(options: Partial<OptimizeCssWebpackPluginOptions>) {
    this._options = {
      sourceMap: false,
      test: file => file.endsWith('.css'),
      ...options,
    };
  }

  apply(compiler: Compiler): void {
    hook(compiler, (compilation: compilation.Compilation, chunks: compilation.Chunk[]) => {
      const files: string[] = [...compilation.additionalChunkAssets];

      chunks.forEach(chunk => {
        if (chunk.files && chunk.files.length > 0) {
          files.push(...chunk.files);
        }
      });

      const actions = files
        .filter(file => this._options.test(file))
        .map(async file => {
          const asset = compilation.assets[file] as Source;
          if (!asset) {
            return;
          }

          let content: string;
          // tslint:disable-next-line: no-any
          let map: any;
          if (this._options.sourceMap && asset.sourceAndMap) {
            const sourceAndMap = asset.sourceAndMap();
            content = sourceAndMap.source;
            map = sourceAndMap.map;
          } else {
            content = asset.source();
          }

          if (content.length === 0) {
            return;
          }

          const cssNanoOptions: cssNano.CssNanoOptions = {
            preset: 'default',
          };

          const postCssOptions: ProcessOptions = {
            from: file,
            map: map && { annotation: false, prev: map },
          };

          const output = await new Promise<Result>((resolve, reject) => {
            // the last parameter is not in the typings
            // tslint:disable-next-line: no-any
            (cssNano.process as any)(content, postCssOptions, cssNanoOptions)
              .then(resolve)
              .catch(reject);
          });

          const warnings = output.warnings();
          if (warnings.length) {
            compilation.warnings.push(...warnings.map(({ text }) => text));
          }

          let newSource;
          if (output.map) {
            newSource = new SourceMapSource(
              output.css,
              file,
              // tslint:disable-next-line: no-any
              output.map.toString() as any,
              content,
              map,
            );
          } else {
            newSource = new RawSource(output.css);
          }

          compilation.assets[file] = newSource;
        });

      return Promise.all(actions);
    });
  }
}
