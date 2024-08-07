/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Extracts a potential locale ID from a given URL based on the specified base path.
 *
 * This function parses the URL to locate a potential locale identifier that immediately
 * follows the base path segment in the URL's pathname. If the URL does not contain a valid
 * locale ID, an empty string is returned.
 *
 * @param url - The full URL from which to extract the locale ID.
 * @param basePath - The base path used as the reference point for extracting the locale ID.
 * @returns The extracted locale ID if present, or an empty string if no valid locale ID is found.
 *
 * @example
 * ```js
 * const url = new URL('https://example.com/base/en/page');
 * const basePath = '/base';
 * const localeId = getPotentialLocaleIdFromUrl(url, basePath);
 * console.log(localeId); // Output: 'en'
 * ```
 */
export function getPotentialLocaleIdFromUrl(url: URL, basePath: string): string {
  const { pathname } = url;

  // Move forward of the base path section.
  let start = basePath.length;
  if (pathname[start] === '/') {
    start++;
  }

  // Find the next forward slash.
  let end = pathname.indexOf('/', start);
  if (end === -1) {
    end = pathname.length;
  }

  // Extract the potential locale id.
  return pathname.slice(start, end);
}
