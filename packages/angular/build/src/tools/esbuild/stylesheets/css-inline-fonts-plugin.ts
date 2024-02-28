/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin, PluginBuild } from 'esbuild';
import { InlineFontsProcessor } from '../../../utils/index-file/inline-fonts';
import { NormalizedCachedOptions } from '../../../utils/normalize-cache';
import { LoadResultCache, createCachedLoad } from '../load-result-cache';

/**
 * Options for the createCssInlineFontsPlugin
 * @see createCssInlineFontsPlugin
 */
export interface CssInlineFontsPluginOptions {
  /** Disk cache normalized options */
  cacheOptions?: NormalizedCachedOptions;
  /** Load results cache. */
  cache?: LoadResultCache;
}

/**
 * Creates an esbuild {@link Plugin} that inlines fonts imported via import-rule.
 * within the build configuration.
 */
export function createCssInlineFontsPlugin({
  cache,
  cacheOptions,
}: CssInlineFontsPluginOptions): Plugin {
  return {
    name: 'angular-css-inline-fonts-plugin',
    setup(build: PluginBuild): void {
      const inlineFontsProcessor = new InlineFontsProcessor({ cache: cacheOptions, minify: false });

      build.onResolve({ filter: /fonts\.googleapis\.com|use\.typekit\.net/ }, (args) => {
        // Only attempt to resolve import-rule tokens which only exist inside CSS.
        if (args.kind !== 'import-rule') {
          return null;
        }

        if (!inlineFontsProcessor.canInlineRequest(args.path)) {
          return null;
        }

        return {
          path: args.path,
          namespace: 'css-inline-fonts',
        };
      });

      build.onLoad(
        { filter: /./, namespace: 'css-inline-fonts' },
        createCachedLoad(cache, async (args) => {
          try {
            return {
              contents: await inlineFontsProcessor.processURL(args.path),
              loader: 'css',
            };
          } catch (error) {
            return {
              loader: 'css',
              errors: [
                {
                  text: `Failed to inline external stylesheet '${args.path}'.`,
                  detail: error,
                },
              ],
            };
          }
        }),
      );
    },
  };
}
