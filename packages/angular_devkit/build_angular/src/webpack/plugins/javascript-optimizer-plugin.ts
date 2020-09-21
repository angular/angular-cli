/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Piscina from 'piscina';
import { ScriptTarget } from 'typescript';
import { maxWorkers } from '../../utils/environment-options';

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
   * This currently increases the `terser` passes to 3 and enables the `pure_getters`
   * option for `terser`.
   */
  advanced: boolean;

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
  sourcemap: boolean;

  /**
   * The ECMAScript version that should be used when generating output code.
   * The optimizer will not adjust the output code with features present in newer
   * ECMAScript versions.
   */
  target: ScriptTarget;

  /**
   * Enables the retention of identifier names and ensures that function and class names are
   * present in the output code.
   */
  keepNames: boolean;

  /**
   * Enables the removal of all license comments from the output code.
   */
  removeLicenses: boolean;
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
  constructor(public options: Partial<JavaScriptOptimizerOptions> = {}) {}

  apply(compiler: import('webpack').Compiler) {
    const { OriginalSource, SourceMapSource } = compiler.webpack.sources;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (compilationAssets) => {
          const scriptsToOptimize = [];

          // Analyze the compilation assets for scripts that require optimization
          for (const assetName of Object.keys(compilationAssets)) {
            if (assetName.endsWith('.js')) {
              const scriptAsset = compilation.getAsset(assetName);
              if (scriptAsset && !scriptAsset.info.minimized) {
                const { source, map } = scriptAsset.source.sourceAndMap();
                scriptsToOptimize.push({
                  name: scriptAsset.name,
                  code: typeof source === 'string' ? source : source.toString(),
                  map,
                });
              }
            }
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

          let target = 2017;
          if (this.options.target) {
            if (this.options.target <= ScriptTarget.ES5) {
              target = 5;
            } else if (this.options.target < ScriptTarget.ESNext) {
              target = Number(ScriptTarget[this.options.target].slice(2));
            } else {
              target = 2020;
            }
          }

          // Setup the options used by all worker tasks
          const optimizeOptions = {
            sourcemap: this.options.sourcemap,
            define,
            keepNames: this.options.keepNames,
            target,
            removeLicenses: this.options.removeLicenses,
            advanced: this.options.advanced,
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
            for (const { name, code, map } of scriptsToOptimize) {
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
                      let optimizedAsset;
                      if (map) {
                        optimizedAsset = new SourceMapSource(code, name, map);
                      } else {
                        optimizedAsset = new OriginalSource(code, name);
                      }
                      compilation.updateAsset(name, optimizedAsset, { minimized: true });
                    },
                    (error) => {
                      const optimizationError = new compiler.webpack.WebpackError(
                        `Optimization error [${name}]: ${error.stack || error.message}`,
                      );
                      compilation.errors.push(optimizationError);
                    },
                  ),
              );
            }

            await Promise.all(tasks);
          } finally {
            void workerPool.destroy();
          }
        },
      );
    });
  }
}
