/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'vite' with {
  'resolution-mode': 'import',
};

// NOTE: the implementation for this Vite plugin is roughly based on:
// https://github.com/MilanKovacic/vite-plugin-externalize-dependencies

const VITE_ID_PREFIX = '@id/';

const escapeRegexSpecialChars = (inputString: string): string => {
  return inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export function createRemoveIdPrefixPlugin(externals: string[]): Plugin {
  return {
    name: 'angular-plugin-remove-id-prefix',
    apply: 'serve',
    configResolved: (resolvedConfig) => {
      // don't do anything when the list of externals is empty
      if (externals.length === 0) {
        return;
      }

      const transformFn = createTransformer(resolvedConfig.base, externals);

      // @ts-expect-error: Property 'push' does not exist on type 'readonly Plugin<any>[]'
      // Reasoning:
      //  since the /@id/ prefix is added by Vite's import-analysis plugin,
      //  we must add our actual plugin dynamically, to ensure that it will run
      //  AFTER the import-analysis.
      resolvedConfig.plugins.push({
        name: 'angular-plugin-remove-id-prefix-transform',
        transform: transformFn,
      });
    },
  };
}

/**
 * Creates a transform function that removes the Vite ID prefix from externals.
 * @param base The base path of the application.
 * @param externals The external package names.
 * @returns A function that transforms code by removing the Vite ID prefix.
 */
export function createTransformer(base: string, externals: string[]): (code: string) => string {
  // The path suffix is bounded so that a match can never extend past the end of an
  // import specifier string literal. With a greedy `.+`, minified (single-line) code
  // would let the first match consume the remainder of the line, leaving all later
  // `/@id/` occurrences on that line unstripped.
  const escapedExternals = externals.map((e) => escapeRegexSpecialChars(e) + '(?:/[^\'"`\\s]+)?');

  const prefixedExternalRegex = new RegExp(
    `${base}${VITE_ID_PREFIX}(${escapedExternals.join('|')})`,
    'g',
  );

  return (code: string) => {
    return code.includes(VITE_ID_PREFIX)
      ? code.replace(prefixedExternalRegex, (_, externalName) => externalName)
      : // don't do anything when code does not contain the Vite prefix
        code;
  };
}
