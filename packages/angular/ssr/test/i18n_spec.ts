/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getPotentialLocaleIdFromUrl } from '../src/i18n';

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
