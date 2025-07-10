/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transformSupportedBrowsersToTargets } from '@angular/build/private';
import type { Message, TransformResult } from 'esbuild';
import type { Compilation, Compiler, sources } from 'webpack';
import { addWarning } from '../../../utils/webpack-diagnostics';
import { EsbuildExecutor } from './esbuild-executor';

/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'angular-css-optimizer';

export interface CssOptimizerPluginOptions {
  supportedBrowsers?: string[];
}

/**
 * A Webpack plugin that provides CSS optimization capabilities.
 *
 * The plugin uses both `esbuild` to provide both fast and highly-optimized
 * code output.
 */
export class CssOptimizerPlugin {
  private targets: string[] | undefined;
  private esbuild = new EsbuildExecutor();

  constructor(options?: CssOptimizerPluginOptions) {
    if (options?.supportedBrowsers) {
      this.targets = transformSupportedBrowsersToTargets(options.supportedBrowsers);
    }
  }

  apply(compiler: Compiler) {
    const { OriginalSource, SourceMapSource } = compiler.webpack.sources;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const logger = compilation.getLogger('build-angular.CssOptimizerPlugin');

      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (compilationAssets) => {
          const cache = compilation.options.cache && compilation.getCache(PLUGIN_NAME);

          logger.time('optimize css assets');
          for (const assetName of Object.keys(compilationAssets)) {
            if (!/\.(?:css|scss|sass|less)$/.test(assetName)) {
              continue;
            }

            const asset = compilation.getAsset(assetName);
            // Skip assets that have already been optimized or are verbatim copies (project assets)
            if (!asset || asset.info.minimized || asset.info.copied) {
              continue;
            }

            const { source: styleAssetSource, name } = asset;
            let cacheItem;

            if (cache) {
              const eTag = cache.getLazyHashedEtag(styleAssetSource);
              cacheItem = cache.getItemCache(name, eTag);
              const cachedOutput = await cacheItem.getPromise<
                { source: sources.Source; warnings: Message[] } | undefined
              >();

              if (cachedOutput) {
                logger.debug(`${name} restored from cache`);
                await this.addWarnings(compilation, cachedOutput.warnings);
                compilation.updateAsset(name, cachedOutput.source, (assetInfo) => ({
                  ...assetInfo,
                  minimized: true,
                }));
                continue;
              }
            }

            const { source, map: inputMap } = styleAssetSource.sourceAndMap();
            const input = typeof source === 'string' ? source : source.toString();

            const optimizeAssetLabel = `optimize asset: ${asset.name}`;
            logger.time(optimizeAssetLabel);
            const { code, warnings, map } = await this.optimize(
              input,
              asset.name,
              inputMap,
              this.targets,
            );
            logger.timeEnd(optimizeAssetLabel);

            await this.addWarnings(compilation, warnings);

            const optimizedAsset = map
              ? new SourceMapSource(code, name, map)
              : new OriginalSource(code, name);
            compilation.updateAsset(name, optimizedAsset, (assetInfo) => ({
              ...assetInfo,
              minimized: true,
            }));

            await cacheItem?.storePromise({
              source: optimizedAsset,
              warnings,
            });
          }
          logger.timeEnd('optimize css assets');
        },
      );
    });
  }

  /**
   * Optimizes a CSS asset using esbuild.
   *
   * @param input The CSS asset source content to optimize.
   * @param name The name of the CSS asset. Used to generate source maps.
   * @param inputMap Optionally specifies the CSS asset's original source map that will
   * be merged with the intermediate optimized source map.
   * @param target Optionally specifies the target browsers for the output code.
   * @returns A promise resolving to the optimized CSS, source map, and any warnings.
   */
  private optimize(
    input: string,
    name: string,
    inputMap: object | null,
    target: string[] | undefined,
  ): Promise<TransformResult> {
    let sourceMapLine;
    if (inputMap) {
      // esbuild will automatically remap the sourcemap if provided
      sourceMapLine = `\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
        JSON.stringify(inputMap),
      ).toString('base64')} */`;
    }

    return this.esbuild.transform(sourceMapLine ? input + sourceMapLine : input, {
      loader: 'css',
      legalComments: 'inline',
      minify: true,
      sourcemap: !!inputMap && 'external',
      sourcefile: name,
      target,
    });
  }

  private async addWarnings(compilation: Compilation, warnings: Message[]) {
    if (warnings.length > 0) {
      for (const warning of await this.esbuild.formatMessages(warnings, { kind: 'warning' })) {
        addWarning(compilation, warning);
      }
    }
  }
}
