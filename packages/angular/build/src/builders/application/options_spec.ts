/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NormalizedApplicationBuildOptions, getLocaleBaseHref } from './options';

describe('getLocaleBaseHref', () => {
  const baseI18nOptions: NormalizedApplicationBuildOptions['i18nOptions'] = {
    inlineLocales: new Set(),
    sourceLocale: 'en-US',
    locales: {},
    flatOutput: false,
    shouldInline: false,
    hasDefinedSourceLocale: false,
  };

  it('should return undefined if flatOutput is true', () => {
    const result = getLocaleBaseHref(undefined, { ...baseI18nOptions, flatOutput: true }, 'fr');
    expect(result).toBeUndefined();
  });

  it('should return undefined if locale is not found', () => {
    const result = getLocaleBaseHref(undefined, baseI18nOptions, 'fr');
    expect(result).toBeUndefined();
  });

  it('should return baseHref from locale data if present', () => {
    const i18nOptions = {
      ...baseI18nOptions,
      locales: {
        fr: {
          files: [],
          translation: {},
          subPath: 'fr',
          baseHref: '/fr/',
        },
      },
    };
    const result = getLocaleBaseHref(undefined, i18nOptions, 'fr');
    expect(result).toBe('/fr/');
  });

  it('should join baseHref and locale subPath if baseHref is provided', () => {
    const i18nOptions = {
      ...baseI18nOptions,
      locales: {
        fr: {
          files: [],
          translation: {},
          subPath: 'fr',
        },
      },
    };
    const result = getLocaleBaseHref('/app/', i18nOptions, 'fr');
    expect(result).toBe('/app/fr/');
  });

  it('should handle missing baseHref (undefined) correctly', () => {
    const i18nOptions = {
      ...baseI18nOptions,
      locales: {
        fr: {
          files: [],
          translation: {},
          subPath: 'fr',
        },
      },
    };
    const result = getLocaleBaseHref(undefined, i18nOptions, 'fr');
    expect(result).toBe('/fr/');
  });

  it('should handle empty baseHref correctly', () => {
    const i18nOptions = {
      ...baseI18nOptions,
      locales: {
        fr: {
          files: [],
          translation: {},
          subPath: 'fr',
        },
      },
    };
    const result = getLocaleBaseHref('', i18nOptions, 'fr');
    expect(result).toBe('/fr/');
  });

  it('should strip leading slash if baseHref does not start with slash', () => {
    const i18nOptions = {
      ...baseI18nOptions,
      locales: {
        fr: {
          files: [],
          translation: {},
          subPath: 'fr',
        },
      },
    };
    const result = getLocaleBaseHref('app/', i18nOptions, 'fr');
    expect(result).toBe('app/fr/');
  });
});
