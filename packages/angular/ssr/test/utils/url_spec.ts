/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { joinUrlParts, stripIndexHtmlFromURL, stripTrailingSlash } from '../../src/utils/url'; // Adjust the import path as needed

describe('URL Utils', () => {
  describe('stripTrailingSlash', () => {
    it('should remove trailing slash from URL', () => {
      expect(stripTrailingSlash('/path/')).toBe('/path');
    });

    it('should not modify URL if no trailing slash is present', () => {
      expect(stripTrailingSlash('/path')).toBe('/path');
    });

    it('should handle empty URL', () => {
      expect(stripTrailingSlash('')).toBe('');
    });

    it('should handle URL with only a trailing slash', () => {
      expect(stripTrailingSlash('/')).toBe('');
    });
  });

  describe('joinUrlParts', () => {
    it('should join multiple URL parts with normalized slashes', () => {
      expect(joinUrlParts('', 'path/', '/to/resource')).toBe('/path/to/resource');
    });

    it('should handle URL parts with leading and trailing slashes', () => {
      expect(joinUrlParts('/', '/path/', 'to/resource/')).toBe('/path/to/resource');
    });

    it('should handle empty URL parts', () => {
      expect(joinUrlParts('', '', 'path', '', 'to/resource')).toBe('/path/to/resource');
    });
  });

  describe('stripIndexHtmlFromURL', () => {
    it('should remove /index.html from the end of the URL path', () => {
      const url = new URL('http://www.example.com/page/index.html');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/page');
    });

    it('should not modify the URL if /index.html is not present', () => {
      const url = new URL('http://www.example.com/page');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/page');
    });

    it('should handle URLs without a path', () => {
      const url = new URL('http://www.example.com/index.html');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/');
    });

    it('should not modify the URL if /index.html is in the middle of the path', () => {
      const url = new URL('http://www.example.com/index.html/page');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/index.html/page');
    });

    it('should handle URLs with query parameters and /index.html at the end', () => {
      const url = new URL('http://www.example.com/page/index.html?query=123');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/page?query=123');
    });

    it('should handle URLs with a fragment and /index.html at the end', () => {
      const url = new URL('http://www.example.com/page/index.html#section');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/page#section');
    });

    it('should handle URLs with both query parameters and fragments and /index.html at the end', () => {
      const url = new URL('http://www.example.com/page/index.html?query=123#section');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('http://www.example.com/page?query=123#section');
    });

    it('should handle URLs with HTTPS scheme and /index.html at the end', () => {
      const url = new URL('https://www.example.com/page/index.html');
      const result = stripIndexHtmlFromURL(url);
      expect(result.href).toBe('https://www.example.com/page');
    });
  });
});
