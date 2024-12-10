/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getPotentialLocaleIdFromUrl, getPreferredLocale } from '../src/i18n';

describe('getPotentialLocaleIdFromUrl', () => {
  it('should extract locale ID correctly when basePath is present', () => {
    const url = new URL('https://example.com/base/en/page');
    const basePath = '/base';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });

  it('should extract locale ID correctly when basePath has trailing slash', () => {
    const url = new URL('https://example.com/base/en/page');
    const basePath = '/base/';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });

  it('should extract locale ID correctly when url has no trailing slash', () => {
    const url = new URL('https://example.com/base/en');
    const basePath = '/base/';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });

  it('should extract locale ID correctly when url no trailing slash', () => {
    const url = new URL('https://example.com/base/en/');
    const basePath = '/base/';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });

  it('should handle URL with no pathname after basePath', () => {
    const url = new URL('https://example.com/base/');
    const basePath = '/base';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('');
  });

  it('should handle URL where basePath is the entire pathname', () => {
    const url = new URL('https://example.com/base');
    const basePath = '/base';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('');
  });

  it('should handle complex basePath correctly', () => {
    const url = new URL('https://example.com/base/path/en/page');
    const basePath = '/base/path';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });

  it('should handle URL with query parameters and hash', () => {
    const url = new URL('https://example.com/base/en?query=param#hash');
    const basePath = '/base';
    const localeId = getPotentialLocaleIdFromUrl(url, basePath);
    expect(localeId).toBe('en');
  });
});

describe('getPreferredLocale', () => {
  it('should return the exact match with the highest quality value', () => {
    const header = 'en-GB;q=0.8,fr-FR;q=0.9';
    const supportedLocales = ['en-GB', 'fr-FR', 'fr-BE'];
    const result = getPreferredLocale(header, supportedLocales);
    // Exact match for 'fr-FR' with the highest quality (0.9)
    expect(result).toBe('fr-FR');
  });

  it('should return the best match when no exact match is found, using language prefixes', () => {
    const header = 'en-GB;q=0.9,fr;q=0.8';
    const supportedLocales = ['fr-FR', 'de-DE', 'en-US'];
    const result = getPreferredLocale(header, supportedLocales);
    // 'en-US' is the exact match with the highest quality (0.9)
    expect(result).toBe('en-US');
  });

  it('should match based on language prefix when no exact match is found', () => {
    const header = 'en-US;q=0.8,fr;q=0.9,en-GB;q=0.7';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);
    // Best match is 'en-GB' based on exact match (0.8 for 'en-US')
    expect(result).toBe('en-GB');
  });

  it('should return the first available locale when no exact match or prefix is found', () => {
    const header = 'it-IT;q=0.8';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);
    // The first locale in the supportedLocales set
    expect(result).toBe('en-GB');
  });

  it('should return the first available locale when the header is empty', () => {
    const header = '';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);
    expect(result).toBe('en-GB'); // The first locale in the supportedLocales set
  });

  it('should return the first available locale when the header is just "*"', () => {
    const header = '*';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);
    // The first locale in the supportedLocales set
    expect(result).toBe('en-GB');
  });

  it('should return the first available locale when no valid languages are in header', () => {
    const header = 'xyz;q=0.5';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);
    // No valid language, fallback to the first available locale
    expect(result).toBe('en-GB');
  });

  it('should return the closest match when no valid languages in header', () => {
    const header = 'en-XYZ;q=0.7,fr-XYZ;q=0.8';
    const supportedLocales = ['en-GB', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);

    // Since there is no exact match for 'en-XYZ' or 'fr-XYZ',
    // the function should return 'fr-FR' as the closest match,
    // as it shares the language prefix 'fr' with the 'fr-XYZ' in the header.
    expect(result).toBe('fr-FR');
  });

  it('should ignore locales with quality 0 and choose the highest quality supported locale', () => {
    const header = 'en-GB;q=0,fr;q=0.9';
    const supportedLocales = ['en-GB', 'fr-FR', 'fr-BE'];
    const result = getPreferredLocale(header, supportedLocales);
    // 'en-GB' is ignored because quality is 0, so 'fr-FR' is chosen
    expect(result).toBe('fr-FR');
  });

  it('should select the highest quality supported locale as fallback, ignoring those with quality 0', () => {
    const header = 'en-GB;q=0';
    const supportedLocales = ['en-GB', 'fr-FR', 'fr-BE'];
    const result = getPreferredLocale(header, supportedLocales);
    // 'en-GB' is ignored because quality is 0, so 'fr-FR' is chosen as the highest quality supported locale
    expect(result).toBe('fr-FR');
  });

  it('should select the closest match based on quality before considering wildcard "*"', () => {
    const header = 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5';
    const supportedLocales = ['it-IT', 'fr-FR', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);

    // 'fr-FR' matches the 'fr' prefix with quality 0.9
    expect(result).toBe('fr-FR');
  });

  it('should select the first available locale when only the wildcard "*" matches', () => {
    const header = 'fr-CH, fr;q=0.9, *;q=0.5';
    const supportedLocales = ['it-IT', 'de-DE'];
    const result = getPreferredLocale(header, supportedLocales);

    // Since 'fr-CH' and 'fr' do not match any supported locales,
    // and '*' is present with quality 0.5, the first supported locale is chosen as a fallback.
    expect(result).toBe('it-IT');
  });
});
