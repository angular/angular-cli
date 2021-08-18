/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Message, formatMessages, transform } from 'esbuild';
import type { Compilation, Compiler, sources } from 'webpack';
import { addWarning } from '../../utils/webpack-diagnostics';
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

  constructor(options?: CssOptimizerPluginOptions) {
    if (options?.supportedBrowsers) {
      this.targets = this.transformSupportedBrowsersToTargets(options.supportedBrowsers);
    }
  }

  apply(compiler: Compiler) {
    const { OriginalSource, SourceMapSource } = compiler.webpack.sources;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (compilationAssets) => {
          const cache = compilation.options.cache && compilation.getCache(PLUGIN_NAME);

          for (const assetName of Object.keys(compilationAssets)) {
            if (!/\.(?:css|scss|sass|less|styl)$/.test(assetName)) {
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
                await this.addWarnings(compilation, cachedOutput.warnings);
                compilation.updateAsset(name, cachedOutput.source, {
                  minimized: true,
                });
                continue;
              }
            }

            const { source, map: inputMap } = styleAssetSource.sourceAndMap();
            let sourceMapLine;
            if (inputMap) {
              // esbuild will automatically remap the sourcemap if provided
              sourceMapLine = `\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
                JSON.stringify(inputMap),
              ).toString('base64')} */`;
            }

            const input = typeof source === 'string' ? source : source.toString();
            const { code, warnings, map } = await transform(
              sourceMapLine ? input + sourceMapLine : input,
              {
                loader: 'css',
                legalComments: 'inline',
                minify: true,
                sourcemap: !!inputMap && 'external',
                sourcefile: asset.name,
                target: this.targets,
              },
            );

            await this.addWarnings(compilation, warnings);

            const optimizedAsset = map
              ? new SourceMapSource(code, name, map)
              : new OriginalSource(code, name);
            compilation.updateAsset(name, optimizedAsset, { minimized: true });

            await cacheItem?.storePromise({
              source: optimizedAsset,
              warnings,
            });
          }
        },
      );
    });
  }

  private async addWarnings(compilation: Compilation, warnings: Message[]) {
    if (warnings.length > 0) {
      for (const warning of await formatMessages(warnings, { kind: 'warning' })) {
        addWarning(compilation, warning);
      }
    }
  }

  private transformSupportedBrowsersToTargets(supportedBrowsers: string[]): string[] | undefined {
    const transformed: string[] = [];

    // https://esbuild.github.io/api/#target
    const esBuildSupportedBrowsers = new Set(['safari', 'firefox', 'edge', 'chrome', 'ios']);

    for (const browser of supportedBrowsers) {
      const [browserName, version] = browser.split(' ');
      if (esBuildSupportedBrowsers.has(browserName)) {
        transformed.push(browserName + version);
      }
    }

    return transformed.length ? transformed : undefined;
  }
}
