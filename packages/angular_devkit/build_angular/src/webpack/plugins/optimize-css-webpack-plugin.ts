/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as cssNano from 'cssnano';
import { ProcessOptions, Result } from 'postcss';
import { Compilation, Compiler, sources } from 'webpack';
import { addError, addWarning } from '../../utils/webpack-diagnostics';

export interface OptimizeCssWebpackPluginOptions {
  sourceMap: boolean;
  test: (file: string) => boolean;
}

const PLUGIN_NAME = 'optimize-css-webpack-plugin';

function hook(
  compiler: Compiler,
  action: (compilation: Compilation, assetsURI: string[]) => Promise<void>,
) {
  compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    compilation.hooks.processAssets.tapPromise(
      {
        name: PLUGIN_NAME,
        stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
      },
      (assets) => action(compilation, Object.keys(assets)),
    );
  });
}

export class OptimizeCssWebpackPlugin {
  private readonly _options: OptimizeCssWebpackPluginOptions;

  constructor(options: Partial<OptimizeCssWebpackPluginOptions>) {
    this._options = {
      sourceMap: false,
      test: (file) => file.endsWith('.css'),
      ...options,
    };
  }

  apply(compiler: Compiler): void {
    hook(compiler, (compilation: Compilation, assetsURI: string[]) => {
      const files = [...compilation.additionalChunkAssets, ...assetsURI];

      const actions = files
        .filter((file) => this._options.test(file))
        .map(async (file) => {
          const asset = compilation.assets[file];
          if (!asset) {
            return;
          }

          let content: string | Buffer;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let map: any;
          if (this._options.sourceMap && asset.sourceAndMap) {
            const sourceAndMap = asset.sourceAndMap({});
            content = sourceAndMap.source;
            map = sourceAndMap.map;
          } else {
            content = asset.source();
          }

          if (typeof content !== 'string') {
            content = content.toString();
          }

          if (content.length === 0) {
            return;
          }

          const cssNanoOptions: cssNano.CssNanoOptions = {
            preset: [
              'default',
              {
                // Disable SVG optimizations, as this can cause optimizations which are not compatible in all browsers.
                svgo: false,
                // Disable `calc` optimizations, due to several issues. #16910, #16875, #17890
                calc: false,
              },
            ],
          };

          const postCssOptions: ProcessOptions = {
            from: file,
            map: map && { annotation: false, prev: map },
          };

          try {
            const output = await new Promise<Result>((resolve, reject) => {
              // @types/cssnano are not up to date with version 5.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cssNano as any)(cssNanoOptions)
                .process(content, postCssOptions)
                .then(resolve)
                .catch((err: Error) => reject(err));
            });

            for (const { text } of output.warnings()) {
              addWarning(compilation, text);
            }

            let newSource;
            if (output.map) {
              newSource = new sources.SourceMapSource(
                output.css,
                file,
                output.map.toString(),
                content,
                map,
              );
            } else {
              newSource = new sources.RawSource(output.css);
            }

            compilation.assets[file] = newSource;
          } catch (error) {
            addError(compilation, error.message);

            return;
          }
        });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return Promise.all(actions).then(() => {});
    });
  }
}
