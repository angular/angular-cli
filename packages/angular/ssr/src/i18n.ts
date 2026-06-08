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

/**
 * Parses the `Accept-Language` header and returns a list of locale preferences with their respective quality values.
 *
 * The `Accept-Language` header is typically a comma-separated list of locales, with optional quality values
 * in the form of `q=<value>`. If no quality value is specified, a default quality of `1` is assumed.
 * Special case: if the header is `*`, it returns the default locale with a quality of `1`.
 *
 * @param header - The value of the `Accept-Language` header, typically a comma-separated list of locales
 *                  with optional quality values (e.g., `en-US;q=0.8,fr-FR;q=0.9`). If the header is `*`,
 *                  it represents a wildcard for any language, returning the default locale.
 *
 * @returns A `ReadonlyMap` where the key is the locale (e.g., `en-US`, `fr-FR`), and the value is
 *          the associated quality value (a number between 0 and 1). If no quality value is provided,
 *          a default of `1` is used.
 *
 * @example
 * ```js
 * parseLanguageHeader('en-US;q=0.8,fr-FR;q=0.9')
 * // returns new Map([['en-US', 0.8], ['fr-FR', 0.9]])

 * parseLanguageHeader('*')
 * // returns new Map([['*', 1]])
 * ```
 */
function parseLanguageHeader(header: string): ReadonlyMap<string, number> {
  if (header === '*') {
    return new Map([['*', 1]]);
  }

  const parsedValues = header
    .split(',')
    .map((item) => {
      const [locale, qualityValue] = item.split(';', 2).map((v) => v.trim());

      let quality = qualityValue?.startsWith('q=') ? parseFloat(qualityValue.slice(2)) : undefined;
      if (typeof quality !== 'number' || isNaN(quality) || quality < 0 || quality > 1) {
        quality = 1; // Invalid quality value defaults to 1
      }

      return [locale, quality] as const;
    })
    .sort(([_localeA, qualityA], [_localeB, qualityB]) => qualityB - qualityA);

  return new Map(parsedValues);
}

/**
 * Gets the preferred locale based on the highest quality value from the provided `Accept-Language` header
 * and the set of available locales.
 *
 * This function adheres to the HTTP `Accept-Language` header specification as defined in
 * [RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.5), including:
 * - Case-insensitive matching of language tags.
 * - Quality value handling (e.g., `q=1`, `q=0.8`). If no quality value is provided, it defaults to `q=1`.
 * - Prefix matching (e.g., `en` matching `en-US` or `en-GB`).
 *
 * @param header - The `Accept-Language` header string to parse and evaluate. It may contain multiple
 *                 locales with optional quality values, for example: `'en-US;q=0.8,fr-FR;q=0.9'`.
 * @param supportedLocales - An array of supported locales (e.g., `['en-US', 'fr-FR']`),
 *                           representing the locales available in the application.
 * @returns The best matching locale from the supported languages, or `undefined` if no match is found.
 *
 * @example
 * ```js
 * getPreferredLocale('en-US;q=0.8,fr-FR;q=0.9', ['en-US', 'fr-FR', 'de-DE'])
 * // returns 'fr-FR'
 *
 * getPreferredLocale('en;q=0.9,fr-FR;q=0.8', ['en-US', 'fr-FR', 'de-DE'])
 * // returns 'en-US'
 *
 * getPreferredLocale('es-ES;q=0.7', ['en-US', 'fr-FR', 'de-DE'])
 * // returns undefined
 * ```
 */
export function getPreferredLocale(
  header: string,
  supportedLocales: ReadonlyArray<string>,
): string | undefined {
  if (supportedLocales.length < 2) {
    return supportedLocales[0];
  }

  const parsedLocales = parseLanguageHeader(header);

  // Handle edge cases:
  // - No preferred locales provided.
  // - Only one supported locale.
  // - Wildcard preference.
  if (parsedLocales.size === 0 || (parsedLocales.size === 1 && parsedLocales.has('*'))) {
    return supportedLocales[0];
  }

  // Create a map for case-insensitive lookup of supported locales.
  // Keys are normalized (lowercase) locale values, values are original casing.
  const normalizedSupportedLocales = new Map<string, string>();
  for (const locale of supportedLocales) {
    normalizedSupportedLocales.set(normalizeLocale(locale), locale);
  }

  // Iterate through parsed locales in descending order of quality.
  let bestMatch: string | undefined;
  const qualityZeroNormalizedLocales = new Set<string>();
  for (const [locale, quality] of parsedLocales) {
    const normalizedLocale = normalizeLocale(locale);
    if (quality === 0) {
      qualityZeroNormalizedLocales.add(normalizedLocale);
      continue; // Skip locales with quality value of 0.
    }

    // Exact match found.
    if (normalizedSupportedLocales.has(normalizedLocale)) {
      return normalizedSupportedLocales.get(normalizedLocale);
    }

    // If an exact match is not found, try prefix matching (e.g., "en" matches "en-US").
    // Store the first prefix match encountered, as it has the highest quality value.
    if (bestMatch !== undefined) {
      continue;
    }

    const [languagePrefix] = normalizedLocale.split('-', 1);
    for (const supportedLocale of normalizedSupportedLocales.keys()) {
      if (supportedLocale.startsWith(languagePrefix)) {
        bestMatch = normalizedSupportedLocales.get(supportedLocale);
        break; // No need to continue searching for this locale.
      }
    }
  }

  if (bestMatch !== undefined) {
    return bestMatch;
  }

  // Return the first locale that is not quality zero.
  for (const [normalizedLocale, locale] of normalizedSupportedLocales) {
    if (!qualityZeroNormalizedLocales.has(normalizedLocale)) {
      return locale;
    }
  }
}

/**
 * Normalizes a locale string by converting it to lowercase.
 *
 * @param locale - The locale string to normalize.
 * @returns The normalized locale string in lowercase.
 *
 * @example
 * ```ts
 * const normalized = normalizeLocale('EN-US');
 * console.log(normalized); // Output: "en-us"
 * ```
 */
function normalizeLocale(locale: string): string {
  return locale.toLowerCase();
}
