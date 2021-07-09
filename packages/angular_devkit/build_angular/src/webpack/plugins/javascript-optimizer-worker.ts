/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping from '@ampproject/remapping';
import { transform } from 'esbuild';
import { minify } from 'terser';

/**
 * A request to optimize JavaScript using the supplied options.
 */
interface OptimizeRequest {
  /**
   * The options to use when optimizing.
   */
  options: {
    advanced: boolean;
    define?: Record<string, string>;
    keepNames: boolean;
    removeLicenses: boolean;
    sourcemap: boolean;
    target: 5 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020;
  };

  /**
   * The JavaScript asset to optimize.
   */
  asset: {
    name: string;
    code: string;
    map: object;
  };
}

export default async function ({ asset, options }: OptimizeRequest) {
  // esbuild is used as a first pass
  const esbuildResult = await transform(asset.code, {
    minifyIdentifiers: !options.keepNames,
    minifySyntax: true,
    // NOTE: Disabling whitespace ensures unused pure annotations are kept
    minifyWhitespace: false,
    pure: ['forwardRef'],
    legalComments: options.removeLicenses ? 'none' : 'inline',
    sourcefile: asset.name,
    sourcemap: options.sourcemap && 'external',
    define: options.define,
    keepNames: options.keepNames,
    target: `es${options.target}`,
  });

  // terser is used as a second pass
  const terserResult = await optimizeWithTerser(
    asset.name,
    esbuildResult.code,
    options.sourcemap,
    options.target,
    options.advanced,
  );

  // Merge intermediate sourcemaps with input sourcemap if enabled
  let fullSourcemap;
  if (options.sourcemap) {
    const partialSourcemaps = [];

    if (esbuildResult.map) {
      partialSourcemaps.unshift(JSON.parse(esbuildResult.map));
    }

    if (terserResult.map) {
      partialSourcemaps.unshift(terserResult.map);
    }

    partialSourcemaps.push(asset.map);

    fullSourcemap = remapping(partialSourcemaps, () => null);
  }

  return { name: asset.name, code: terserResult.code, map: fullSourcemap };
}

async function optimizeWithTerser(
  name: string,
  code: string,
  sourcemaps: boolean,
  target: OptimizeRequest['options']['target'],
  advanced: boolean,
): Promise<{ code: string; map?: object }> {
  const result = await minify(
    { [name]: code },
    {
      compress: {
        passes: advanced ? 2 : 1,
        pure_getters: advanced,
      },
      ecma: target,
      // esbuild in the first pass is used to minify identifiers instead of mangle here
      mangle: false,
      format: {
        // ASCII output is enabled here as well to prevent terser from converting back to UTF-8
        ascii_only: true,
        wrap_func_args: false,
      },
      sourceMap:
        sourcemaps &&
        ({
          asObject: true,
          // typings don't include asObject option
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
    },
  );

  if (!result.code) {
    throw new Error('Terser failed for unknown reason.');
  }

  return { code: result.code, map: result.map as object };
}
