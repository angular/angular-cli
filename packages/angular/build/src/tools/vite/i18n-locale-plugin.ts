/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'vite';

/**
 * The base module location used to search for locale specific data.
 */
export const LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';

/**
 * Creates a Vite plugin that resolves Angular locale data files from `@angular/common`.
 *
 * @returns A Vite plugin.
 */
export function createAngularLocaleDataPlugin(): Plugin {
  return {
    name: 'angular-locale-data',
    enforce: 'pre',
    async resolveId(source) {
      if (!source.startsWith('angular:locale/data:')) {
        return;
      }

      // Extract the locale from the path
      const originalLocale = source.split(':', 3)[2];

      // Remove any private subtags since these will never match
      let partialLocale = originalLocale.replace(/-x(-[a-zA-Z0-9]{1,8})+$/, '');

      let exact = true;
      while (partialLocale) {
        const potentialPath = `${LOCALE_DATA_BASE_MODULE}/${partialLocale}`;

        const result = await this.resolve(potentialPath);
        if (result) {
          if (!exact) {
            this.warn(
              `Locale data for '${originalLocale}' cannot be found. Using locale data for '${partialLocale}'.`,
            );
          }

          return result;
        }

        // Remove the last subtag and try again with a less specific locale
        const parts = partialLocale.split('-');
        partialLocale = parts.slice(0, -1).join('-');
        exact = false;
        // The locales "en" and "en-US" are considered exact to retain existing behavior
        if (originalLocale === 'en-US' && partialLocale === 'en') {
          exact = true;
        }
      }

      return null;
    },
  };
}
