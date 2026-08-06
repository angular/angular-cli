/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { calculateHash } from '../../../utils/hash';
import type { BundleStylesheetOptions } from './bundle-options';

/**
 * Generates a global hash based on all build options that affect stylesheet compilation.
 *
 * IMPORTANT: This hash acts as the root cache key prefix for all persistent stylesheet cache
 * entries. Any change in the values hashed below will invalidate all cached stylesheet outputs
 * across the entire application.
 *
 * Included build options and their rationale:
 * - `optimization`: Affects CSS minification, dead code elimination, and whitespace stripping.
 * - `sourcemap`: Toggles inline/external source map generation and comment insertion.
 * - `sourcesContent`: Toggles embedding original source content inside generated source maps.
 * - `includePaths`: Changes Sass/Less `@import` and `@use` path resolution search directories.
 * - `sassOptions`: Changes Sass compiler deprecations and behavior flags.
 * - `target`: Affects CSS property lowering and browser vendor prefixing in esbuild.
 * - `publicPath`: Affects relative asset URL rewriting (`url('...')`) inside CSS output.
 * - `outputNames`: Affects asset output filename hashing schemes.
 * - `inlineFonts`: Controls whether external web font `@import` / `<link>` directives are inlined.
 * - `preserveSymlinks`: Controls symlink realpath resolution in monorepos/pnpm workspace packages.
 * - `externalDependencies`: Controls which CSS modules/urls are excluded from bundling.
 * - `postcssConfig`: Path to custom PostCSS configuration file.
 * - `tailwindConfig`: Path to Tailwind CSS configuration file.
 * - `packageVersion`: Invalidates cache across `@angular/build` compiler toolchain updates.
 *
 * @note Maintainers: If any new build option is added to `BundleStylesheetOptions` or `@angular/build`
 * that alters generated stylesheet code or asset outputs, it MUST be added to this hash object.
 */
export function calculateGlobalStylesheetConfigHash(
  options: BundleStylesheetOptions,
  packageVersion: string = '',
): string {
  return calculateHash(
    JSON.stringify({
      optimization: options.optimization,
      sourcemap: options.sourcemap,
      sourcesContent: options.sourcesContent,
      includePaths: options.includePaths,
      sassOptions: options.sass
        ? {
            futureDeprecations: options.sass.futureDeprecations,
            fatalDeprecations: options.sass.fatalDeprecations,
            silenceDeprecations: options.sass.silenceDeprecations,
          }
        : undefined,
      target: options.target,
      publicPath: options.publicPath,
      outputNames: options.outputNames,
      inlineFonts: options.inlineFonts,
      preserveSymlinks: options.preserveSymlinks,
      externalDependencies: options.externalDependencies,
      postcssConfig: options.postcssConfiguration?.configPath
        ? options.postcssConfiguration.configPath
        : '',
      tailwindConfig: options.tailwindConfiguration?.file ? options.tailwindConfiguration.file : '',
      packageVersion,
    }),
  );
}
