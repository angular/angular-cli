/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'esbuild';
import { JavaScriptTransformer, JavaScriptTransformerOptions } from './javascript-transformer';

export interface JavaScriptTransformerPluginOptions extends JavaScriptTransformerOptions {
  babelFileCache?: Map<string, Uint8Array>;
  maxWorkers: number;
}

/**
 * Creates a plugin that Transformers JavaScript using Babel.
 *
 * @returns An esbuild plugin.
 */
export function createJavaScriptTransformerPlugin(
  options: JavaScriptTransformerPluginOptions,
): Plugin {
  return {
    name: 'angular-javascript-transformer',
    setup(build) {
      let javascriptTransformer: JavaScriptTransformer | undefined;
      const {
        sourcemap,
        thirdPartySourcemaps,
        advancedOptimizations,
        jit,
        babelFileCache,
        maxWorkers,
      } = options;

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        // The filename is currently used as a cache key. Since the cache is memory only,
        // the options cannot change and do not need to be represented in the key. If the
        // cache is later stored to disk, then the options that affect transform output
        // would need to be added to the key as well as a check for any change of content.
        let contents = babelFileCache?.get(args.path);
        if (contents === undefined) {
          // Initialize a worker pool for JavaScript transformations
          javascriptTransformer ??= new JavaScriptTransformer(
            {
              sourcemap,
              thirdPartySourcemaps,
              advancedOptimizations,
              jit,
            },
            maxWorkers,
          );

          contents = await javascriptTransformer.transformFile(args.path, jit);
          babelFileCache?.set(args.path, contents);
        }

        return {
          contents,
          loader: 'js',
        };
      });

      build.onDispose(() => {
        void javascriptTransformer?.close();
      });
    },
  };
}
