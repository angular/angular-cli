/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  addLeadingSlash,
  addTrailingSlash,
  buildUrlWithParams,
  joinUrlParts,
  stripIndexHtmlFromURL,
  stripLeadingSlash,
  stripMatrixParams,
  stripTrailingSlash,
} from '../../src/utils/url';

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
      expect(stripTrailingSlash('/')).toBe('/');
    });
  });

  describe('stripLeadingSlash', () => {
    it('should remove leading slash from URL', () => {
      expect(stripLeadingSlash('/path/')).toBe('path/');
    });

    it('should not modify URL if no leading slash is present', () => {
      expect(stripLeadingSlash('path/')).toBe('path/');
    });

    it('should handle empty URL', () => {
      expect(stripLeadingSlash('')).toBe('');
    });

    it('should handle URL with only a leading slash', () => {
      expect(stripLeadingSlash('/')).toBe('/');
    });
  });

  describe('addLeadingSlash', () => {
    it('should add a leading slash to a URL without one', () => {
      expect(addLeadingSlash('path')).toBe('/path');
      expect(addLeadingSlash('path/')).toBe('/path/');
    });

    it('should not modify URL if it already has a leading slash', () => {
      expect(addLeadingSlash('/path/')).toBe('/path/');
    });

    it('should handle empty URL', () => {
      expect(addLeadingSlash('')).toBe('/');
    });
  });

  describe('addTrailingSlash', () => {
    it('should add a trailing slash to a URL without one', () => {
      expect(addTrailingSlash('path')).toBe('path/');
      expect(addTrailingSlash('/path')).toBe('/path/');
    });

    it('should not modify URL if it already has a trailing slash', () => {
      expect(addLeadingSlash('/path/')).toBe('/path/');
    });

    it('should handle empty URL', () => {
      expect(addLeadingSlash('')).toBe('/');
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

    it('should handle an all-empty URL parts', () => {
      expect(joinUrlParts('', '')).toBe('/');
    });

    it('should normalize parts with multiple leading and trailing slashes', () => {
      expect(joinUrlParts('//path//', '///to///', '//resource//')).toBe('/path/to/resource');
    });

    it('should handle a single part', () => {
      expect(joinUrlParts('path')).toBe('/path');
    });

    it('should handle parts containing only slashes', () => {
      expect(joinUrlParts('//', '///')).toBe('/');
    });

    it('should preserve trailing slashes in query parameters and fragments', () => {
      expect(joinUrlParts('/', '/login?next=/a/')).toBe('/login?next=/a/');
      expect(joinUrlParts('/', '/login#section/')).toBe('/login#section/');
      expect(joinUrlParts('/base/', '/foo/?next=/a/#section/')).toBe('/base/foo?next=/a/#section/');
      expect(joinUrlParts('/base/', '/login/#section?next=/a/')).toBe(
        '/base/login#section?next=/a/',
      );
      expect(joinUrlParts('/base/', '/?next=/a/')).toBe('/base?next=/a/');
      expect(joinUrlParts('/', '/?next=/a/')).toBe('/?next=/a/');
      expect(joinUrlParts('', '///evil.com?a=/')).toBe('/evil.com?a=/');
      expect(joinUrlParts('/login/?next=/a/', '')).toBe('/login?next=/a/');
      expect(joinUrlParts('/base/', '/login/?next=/a/', '', '')).toBe('/base/login?next=/a/');
      expect(joinUrlParts('/login/#section/', '')).toBe('/login#section/');
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

  describe('buildUrlWithParams', () => {
    it('should return the same URL when there are no placeholders in the toUrl', () => {
      const fromPath = '/base/path';
      const toUrl = '/static/path';

      const result = buildUrlWithParams(toUrl, fromPath);

      // Since there are no placeholders, the URL remains the same.
      expect(result.toString()).toBe('/static/path');
    });

    it('should replace placeholders with corresponding segments from the base URL path', () => {
      const fromPath = '/base/path';
      const toUrl = '/*/*/details';

      const result = buildUrlWithParams(toUrl, fromPath);

      expect(result.toString()).toBe('/base/path/details');
    });

    it('should replace positional placeholders with the segments at those positions', () => {
      expect(buildUrlWithParams('/user/*2/*1', '/a/b')).toBe('/user/b/a');
    });

    it('should replace a positional placeholder followed by a query or fragment', () => {
      expect(buildUrlWithParams('/user/*1?returnTo=/a//b/', '/a')).toBe('/user/a?returnTo=/a//b/');
      expect(buildUrlWithParams('/user/*1#top', '/a')).toBe('/user/a#top');
    });

    it('should throw an error if the toUrl does not start with "/"', () => {
      const fromPath = '/base/path';
      const toUrl = 'details';

      // This should throw an error because toUrl doesn't start with "/"
      expect(() => {
        buildUrlWithParams(toUrl, fromPath);
      }).toThrowError(`Invalid toUrl: The string must start with a '/'. Received: 'details'`);
    });

    it('should replace query placeholders with the values of the source parameters', () => {
      expect(
        buildUrlWithParams(
          '/search?q=:term&p=:page&static=a=:b#top',
          '/from',
          '?term=big+cats&term=a:b@c&page=2',
        ),
      ).toBe('/search?q=big%20cats&q=a:b@c&p=2&static=a%3D:b#top');
    });

    it('should set query parameters whose source parameter is missing to undefined', () => {
      expect(buildUrlWithParams('/search?q=:term&static=1', '/from', '')).toBe(
        '/search?q=undefined&static=1',
      );
    });

    it('should not replace placeholders of repeated query parameters', () => {
      expect(buildUrlWithParams('/search?q=:a&q=:b', '/from', '?a=1&b=2')).toBe(
        '/search?q=:a&q=:b',
      );
    });
  });

  describe('stripMatrixParams', () => {
    it('should remove a single matrix parameter', () => {
      expect(stripMatrixParams('/path;param=value')).toBe('/path');
    });

    it('should remove multiple matrix parameters in the same segment', () => {
      expect(stripMatrixParams('/path;p1=v1;p2=v2')).toBe('/path');
    });

    it('should remove matrix parameters from multiple segments', () => {
      expect(stripMatrixParams('/path;p1=v1/to;p2=v2/resource')).toBe('/path/to/resource');
    });

    it('should not modify a path without matrix parameters', () => {
      expect(stripMatrixParams('/path/to/resource')).toBe('/path/to/resource');
    });

    it('should handle a root path with matrix parameters', () => {
      expect(stripMatrixParams('/;p1=v1')).toBe('/');
    });

    it('should handle an empty string', () => {
      expect(stripMatrixParams('')).toBe('');
    });
  });
});
