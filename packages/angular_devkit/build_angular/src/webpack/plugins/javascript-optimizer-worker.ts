/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping from '@ampproject/remapping';
import type { TransformResult } from 'esbuild';
import { minify } from 'terser';
import { EsbuildExecutor } from './esbuild-executor';

/**
 * The options to use when optimizing.
 */
export interface OptimizeRequestOptions {
  /**
   * Controls advanced optimizations.
   * Currently these are only terser related:
   * * terser compress passes are set to 2
   * * terser pure_getters option is enabled
   */
  advanced?: boolean;
  /**
   * Specifies the string tokens that should be replaced with a defined value.
   */
  define?: Record<string, string>;
  /**
   * Controls whether class, function, and variable names should be left intact
   * throughout the output code.
   */
  keepIdentifierNames: boolean;

  /**
   * Controls whether to retain the original name of classes and functions.
   */
  keepNames: boolean;
  /**
   * Controls whether license text is removed from the output code.
   * Within the CLI, this option is linked to the license extraction functionality.
   */
  removeLicenses?: boolean;
  /**
   * Controls whether source maps should be generated.
   */
  sourcemap?: boolean;
  /**
   * Specifies the list of supported esbuild targets.
   * @see: https://esbuild.github.io/api/#target
   */
  target?: string[];
  /**
   * Controls whether esbuild should only use the WASM-variant instead of trying to
   * use the native variant. Some platforms may not support the native-variant and
   * this option allows one support test to be conducted prior to all the workers starting.
   */
  alwaysUseWasm: boolean;
}

/**
 * A request to optimize JavaScript using the supplied options.
 */
interface OptimizeRequest {
  /**
   * The options to use when optimizing.
   */
  options: OptimizeRequestOptions;

  /**
   * The JavaScript asset to optimize.
   */
  asset: {
    /**
     * The name of the JavaScript asset (typically the filename).
     */
    name: string;
    /**
     * The source content of the JavaScript asset.
     */
    code: string;
    /**
     * The source map of the JavaScript asset, if available.
     * This map is merged with all intermediate source maps during optimization.
     */
    map: object;
  };
}

/**
 * The cached esbuild executor.
 * This will automatically use the native or WASM version based on platform and availability
 * with the native version given priority due to its superior performance.
 */
let esbuild: EsbuildExecutor | undefined;

/**
 * Handles optimization requests sent from the main thread via the `JavaScriptOptimizerPlugin`.
 */
export default async function ({ asset, options }: OptimizeRequest) {
  // esbuild is used as a first pass
  const esbuildResult = await optimizeWithEsbuild(asset.code, asset.name, options);

  // terser is used as a second pass
  const terserResult = await optimizeWithTerser(
    asset.name,
    esbuildResult.code,
    options.sourcemap,
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

    if (asset.map) {
      partialSourcemaps.push(asset.map);
    }

    fullSourcemap = remapping(partialSourcemaps, () => null);
  }

  return { name: asset.name, code: terserResult.code, map: fullSourcemap };
}

/**
 * Optimizes a JavaScript asset using esbuild.
 *
 * @param content The JavaScript asset source content to optimize.
 * @param name The name of the JavaScript asset. Used to generate source maps.
 * @param options The optimization request options to apply to the content.
 * @returns A promise that resolves with the optimized code, source map, and any warnings.
 */
async function optimizeWithEsbuild(
  content: string,
  name: string,
  options: OptimizeRequest['options'],
): Promise<TransformResult> {
  if (!esbuild) {
    esbuild = new EsbuildExecutor(options.alwaysUseWasm);
  }

  return esbuild.transform(content, {
    minifyIdentifiers: !options.keepIdentifierNames,
    minifySyntax: true,
    // NOTE: Disabling whitespace ensures unused pure annotations are kept
    minifyWhitespace: false,
    pure: ['forwardRef'],
    legalComments: options.removeLicenses ? 'none' : 'inline',
    sourcefile: name,
    sourcemap: options.sourcemap && 'external',
    define: options.define,
    // This option should always be disabled for browser builds as we don't rely on `.name`
    // and causes deadcode to be retained which makes `NG_BUILD_MANGLE` unusable to investigate tree-shaking issues.
    // We enable `keepNames` only for server builds as Domino relies on `.name`.
    // Once we no longer rely on Domino for SSR we should be able to remove this.
    keepNames: options.keepNames,
    target: options.target,
  });
}

/**
 * Optimizes a JavaScript asset using terser.
 *
 * @param name The name of the JavaScript asset. Used to generate source maps.
 * @param code The JavaScript asset source content to optimize.
 * @param sourcemaps If true, generate an output source map for the optimized code.
 * @param advanced Controls advanced optimizations.
 * @returns A promise that resolves with the optimized code and source map.
 */
async function optimizeWithTerser(
  name: string,
  code: string,
  sourcemaps: boolean | undefined,
  advanced: boolean | undefined,
): Promise<{ code: string; map?: object }> {
  const result = await minify(
    { [name]: code },
    {
      compress: {
        passes: advanced ? 2 : 1,
        pure_getters: advanced,
      },
      // terser only supports up to ES2020
      ecma: 2020,
      // esbuild in the first pass is used to minify identifiers instead of mangle here
      mangle: false,
      // esbuild in the first pass is used to minify function names
      keep_fnames: true,
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
