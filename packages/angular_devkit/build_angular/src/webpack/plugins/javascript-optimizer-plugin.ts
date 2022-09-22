/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Piscina from 'piscina';
import type { Compiler, sources } from 'webpack';
import { maxWorkers } from '../../utils/environment-options';
import { transformSupportedBrowsersToTargets } from '../../utils/esbuild-targets';
import { addError } from '../../utils/webpack-diagnostics';
import { EsbuildExecutor } from './esbuild-executor';
import type { OptimizeRequestOptions } from './javascript-optimizer-worker';

/**
 * The maximum number of Workers that will be created to execute optimize tasks.
 */
const MAX_OPTIMIZE_WORKERS = maxWorkers;

/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'angular-javascript-optimizer';

/**
 * The options used to configure the {@link JavaScriptOptimizerPlugin}.
 */
export interface JavaScriptOptimizerOptions {
  /**
   * Enables advanced optimizations in the underlying JavaScript optimizers.
   * This currently increases the `terser` passes to 2 and enables the `pure_getters`
   * option for `terser`.
   */
  advanced?: boolean;

  /**
   * An object record of string keys that will be replaced with their respective values when found
   * within the code during optimization.
   */
  define: Record<string, string | number | boolean>;

  /**
   * Enables the generation of a sourcemap during optimization.
   * The output sourcemap will be a full sourcemap containing the merge of the input sourcemap and
   * all intermediate sourcemaps.
   */
  sourcemap?: boolean;

  /**
   * A list of supported browsers that is used for output code.
   */
  supportedBrowsers?: string[];

  /**
   * Enables the retention of identifier names and ensures that function and class names are
   * present in the output code.
   *
   * **Note**: in some cases symbols are still renamed to avoid collisions.
   */
  keepIdentifierNames: boolean;

  /**
   * Enables the retention of original name of classes and functions.
   *
   * **Note**: this causes increase of bundle size as it causes dead-code elimination to not work fully.
   */
  keepNames: boolean;

  /**
   * Enables the removal of all license comments from the output code.
   */
  removeLicenses?: boolean;
}

/**
 * A Webpack plugin that provides JavaScript optimization capabilities.
 *
 * The plugin uses both `esbuild` and `terser` to provide both fast and highly-optimized
 * code output. `esbuild` is used as an initial pass to remove the majority of unused code
 * as well as shorten identifiers. `terser` is then used as a secondary pass to apply
 * optimizations not yet implemented by `esbuild`.
 */
export class JavaScriptOptimizerPlugin {
  private targets: string[] | undefined;

  constructor(private options: JavaScriptOptimizerOptions) {
    if (options.supportedBrowsers) {
      this.targets = transformSupportedBrowsersToTargets(options.supportedBrowsers);
    }
  }

  apply(compiler: Compiler) {
    const { OriginalSource, SourceMapSource } = compiler.webpack.sources;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const logger = compilation.getLogger('build-angular.JavaScriptOptimizerPlugin');

      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (compilationAssets) => {
          logger.time('optimize js assets');
          const scriptsToOptimize = [];
          const cache =
            compilation.options.cache && compilation.getCache('JavaScriptOptimizerPlugin');

          // Analyze the compilation assets for scripts that require optimization
          for (const assetName of Object.keys(compilationAssets)) {
            if (!assetName.endsWith('.js')) {
              continue;
            }

            const scriptAsset = compilation.getAsset(assetName);
            // Skip assets that have already been optimized or are verbatim copies (project assets)
            if (!scriptAsset || scriptAsset.info.minimized || scriptAsset.info.copied) {
              continue;
            }

            const { source: scriptAssetSource, name } = scriptAsset;
            let cacheItem;

            if (cache) {
              const eTag = cache.getLazyHashedEtag(scriptAssetSource);
              cacheItem = cache.getItemCache(name, eTag);
              const cachedOutput = await cacheItem.getPromise<
                { source: sources.Source } | undefined
              >();

              if (cachedOutput) {
                logger.debug(`${name} restored from cache`);
                compilation.updateAsset(name, cachedOutput.source, (assetInfo) => ({
                  ...assetInfo,
                  minimized: true,
                }));
                continue;
              }
            }

            const { source, map } = scriptAssetSource.sourceAndMap();
            scriptsToOptimize.push({
              name: scriptAsset.name,
              code: typeof source === 'string' ? source : source.toString(),
              map,
              cacheItem,
            });
          }

          if (scriptsToOptimize.length === 0) {
            return;
          }

          // Ensure all replacement values are strings which is the expected type for esbuild
          let define: Record<string, string> | undefined;
          if (this.options.define) {
            define = {};
            for (const [key, value] of Object.entries(this.options.define)) {
              define[key] = String(value);
            }
          }

          // Setup the options used by all worker tasks
          const optimizeOptions: OptimizeRequestOptions = {
            sourcemap: this.options.sourcemap,
            define,
            keepNames: this.options.keepNames,
            keepIdentifierNames: this.options.keepIdentifierNames,
            target: this.targets,
            removeLicenses: this.options.removeLicenses,
            advanced: this.options.advanced,
            // Perform a single native esbuild support check.
            // This removes the need for each worker to perform the check which would
            // otherwise require spawning a separate process per worker.
            alwaysUseWasm: !(await EsbuildExecutor.hasNativeSupport()),
          };

          // Sort scripts so larger scripts start first - worker pool uses a FIFO queue
          scriptsToOptimize.sort((a, b) => a.code.length - b.code.length);

          // Initialize the task worker pool
          const workerPath = require.resolve('./javascript-optimizer-worker');
          const workerPool = new Piscina({
            filename: workerPath,
            maxThreads: MAX_OPTIMIZE_WORKERS,
          });

          // Enqueue script optimization tasks and update compilation assets as the tasks complete
          try {
            const tasks = [];
            for (const { name, code, map, cacheItem } of scriptsToOptimize) {
              logger.time(`optimize asset: ${name}`);

              tasks.push(
                workerPool
                  .run({
                    asset: {
                      name,
                      code,
                      map,
                    },
                    options: optimizeOptions,
                  })
                  .then(
                    ({ code, name, map }) => {
                      const optimizedAsset = map
                        ? new SourceMapSource(code, name, map)
                        : new OriginalSource(code, name);
                      compilation.updateAsset(name, optimizedAsset, (assetInfo) => ({
                        ...assetInfo,
                        minimized: true,
                      }));

                      logger.timeEnd(`optimize asset: ${name}`);

                      return cacheItem?.storePromise({
                        source: optimizedAsset,
                      });
                    },
                    (error) => {
                      addError(
                        compilation,
                        `Optimization error [${name}]: ${error.stack || error.message}`,
                      );
                    },
                  ),
              );
            }

            await Promise.all(tasks);
          } finally {
            void workerPool.destroy();
          }

          logger.timeEnd('optimize js assets');
        },
      );
    });
  }
}
