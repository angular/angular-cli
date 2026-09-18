/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  createRedirectResponse,
  normalizeAndValidateRedirect,
  normalizeAndValidateRoutePath,
} from '../../src/utils/redirect';

describe('Redirect Utils', () => {
  describe('createRedirectResponse', () => {
    it('should create a redirect response with default status 302', () => {
      const response = createRedirectResponse('/home');
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix');
    });

    it('should create a redirect response with a custom status', () => {
      const response = createRedirectResponse('/home', 301);
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('/home');
    });

    it('should allow providing additional headers', () => {
      const response = createRedirectResponse('/home', 302, { 'X-Custom': 'value' });
      expect(response.headers.get('X-Custom')).toBe('value');
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix');
    });

    it('should append to Vary header instead of overriding it', () => {
      const response = createRedirectResponse('/home', 302, {
        'Location': '/evil',
        'Vary': 'Host',
      });
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix, Host');
    });

    it('should NOT add duplicate X-Forwarded-Prefix if already present in Vary header', () => {
      const response = createRedirectResponse('/home', 302, {
        'Vary': 'X-Forwarded-Prefix, Host',
      });
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix, Host');
    });

    it('should warn if Location header is provided in extra headers in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      const warnSpy = spyOn(console, 'warn');
      createRedirectResponse('/home', 302, { 'Location': '/evil' });
      expect(warnSpy).toHaveBeenCalledWith(
        'Location header "/evil" will be ignored and set to "/home".',
      );
    });

    it('should throw error for invalid redirect status code in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      expect(() => createRedirectResponse('/home', 200)).toThrowError(
        /Invalid redirect status code: 200/,
      );
    });

    it('should throw for a location which uses an unsupported protocol', () => {
      // A `Location` can also be produced at render time, for example by a guard which returns a
      // `RedirectCommand`, so it cannot rely on the validation performed during route extraction.
      expect(() => createRedirectResponse('javascript:alert(1)')).toThrowError(
        /Cannot redirect to 'javascript:alert\(1\)': the 'javascript:' protocol is not supported/,
      );
    });

    it('should throw for a location which an untrusted proxy prefix made protocol-relative', () => {
      // 'X-Forwarded-Prefix' is a request header, so a location built from it is untrusted. The
      // URL parser reads a leading '/\\' as an authority, which would redirect off-origin.
      for (const location of ['/\\evil.example/home', '//evil.example/home']) {
        expect(() => createRedirectResponse(location))
          .withContext(location)
          .toThrowError(/is not a valid same-origin path/);
      }
    });

    it('should send the normalized location', () => {
      const response = createRedirectResponse('/docs/../about');
      expect(response.headers.get('Location')).toBe('/about');
    });
  });

  describe('normalizeAndValidateRoutePath', () => {
    it('should keep characters which are legal in a path', () => {
      expect(normalizeAndValidateRoutePath(`/store/customer's-choice`)).toEqual({
        url: `/store/customer's-choice`,
      });
    });

    it('should percent-encode spaces, non-ASCII and HTML-significant characters', () => {
      expect(normalizeAndValidateRoutePath('/docs/a b')).toEqual({ url: '/docs/a%20b' });
      expect(normalizeAndValidateRoutePath('/produits/café')).toEqual({
        url: '/produits/caf%C3%A9',
      });
      expect(normalizeAndValidateRoutePath('/docs/<script>')).toEqual({
        url: '/docs/%3Cscript%3E',
      });
    });

    it('should reject protocol-relative paths', () => {
      expect(normalizeAndValidateRoutePath('//evil.example').error).toContain(
        'is not a valid same-origin path',
      );
    });

    it('should reject paths containing a backslash', () => {
      expect(normalizeAndValidateRoutePath('/\\evil.example').error).toContain(
        'is not a valid same-origin path',
      );
    });

    it('should reject a query string or a fragment', () => {
      expect(normalizeAndValidateRoutePath('/docs/a?b=1').error).toContain(
        'A route cannot carry a query string or a fragment',
      );
      expect(normalizeAndValidateRoutePath('/docs/a#b').error).toContain(
        'A route cannot carry a query string or a fragment',
      );
    });

    it('should reject a path which the parser resolves into a protocol-relative path', () => {
      expect(normalizeAndValidateRoutePath('/..//evil.example').error).toContain(
        `It resolves to the protocol-relative path '//evil.example'.`,
      );
    });

    it('should reject dot segments instead of resolving them', () => {
      expect(normalizeAndValidateRoutePath('/docs/../about').error).toContain(
        `The '..' segment decodes to the '..' path traversal segment`,
      );
      expect(normalizeAndValidateRoutePath('/docs/%2E%2E/about').error).toContain(
        `The '%2E%2E' segment decodes to the '..' path traversal segment`,
      );
    });

    it('should reject segments which decode into a separator', () => {
      // `RouteTree` decodes each segment on insert, so `%2F` would add a segment after validation.
      expect(normalizeAndValidateRoutePath('/store/foo%2Fbar').error).toContain(
        `The 'foo%2Fbar' segment decodes to a value which is not a single path segment`,
      );
      expect(normalizeAndValidateRoutePath('/store/foo%5Cbar').error).toContain(
        `The 'foo%5Cbar' segment decodes to a value which is not a single path segment`,
      );
    });

    it('should reject segments which decode into URL syntax characters', () => {
      expect(normalizeAndValidateRoutePath('/store/a%23b').error).toContain(
        `The 'a%23b' segment decodes to a value which is not a single path segment`,
      );
      expect(normalizeAndValidateRoutePath('/store/a%3Fb').error).toContain(
        `The 'a%3Fb' segment decodes to a value which is not a single path segment`,
      );
    });

    it('should reject segments which still need decoding after being decoded once', () => {
      // The decoded route is serialized into the manifest and decoded again when the route tree is
      // restored on the server, which would throw for a value that still contains a `%`.
      expect(normalizeAndValidateRoutePath('/store/a%2520b').error).toContain(
        `The 'a%2520b' segment decodes to a value which is not a single path segment`,
      );
    });

    it('should reject malformed percent escapes', () => {
      expect(normalizeAndValidateRoutePath('/store/50%').error).toContain(
        `The '50%' segment is not a valid percent-encoded value`,
      );
      expect(normalizeAndValidateRoutePath('/store/%ZZ').error).toContain(
        `The '%ZZ' segment is not a valid percent-encoded value`,
      );
    });
  });

  describe('normalizeAndValidateRedirect', () => {
    it('should normalize a same-origin path', () => {
      expect(normalizeAndValidateRedirect('/ssg')).toEqual({ url: '/ssg' });
    });

    it('should keep a query string and a fragment', () => {
      expect(normalizeAndValidateRedirect('/docs/page-1?from=ssg&next=/home#top')).toEqual({
        url: '/docs/page-1?from=ssg&next=/home#top',
      });
    });

    it('should resolve dot segments', () => {
      expect(normalizeAndValidateRedirect('/docs/../about')).toEqual({ url: '/about' });
    });

    it('should allow HTTP(S) targets', () => {
      expect(normalizeAndValidateRedirect('https://example.com/docs?from=ssg&next=/ssg')).toEqual({
        url: 'https://example.com/docs?from=ssg&next=/ssg',
      });
    });

    it('should normalize an absolute target', () => {
      expect(normalizeAndValidateRedirect('HTTPS://Example.com/A b')).toEqual({
        url: 'https://example.com/A%20b',
      });
    });

    it('should reject an empty target', () => {
      expect(normalizeAndValidateRedirect('  ').error).toContain('cannot be empty');
    });

    it('should reject a target which is not a string', () => {
      // The value comes straight from the route configuration, which is not necessarily type
      // checked, so it is reported as a diagnostic rather than thrown as a `TypeError`.
      for (const [target, type] of [
        [42, 'number'],
        [undefined, 'undefined'],
        [null, 'object'],
      ] as const) {
        expect(normalizeAndValidateRedirect(target as unknown as string).error)
          .withContext(`${target}`)
          .toContain(
            `the redirect target must be a string, but a value of type '${type}' was provided.`,
          );
      }
    });

    it('should reject unsupported protocols', () => {
      expect(normalizeAndValidateRedirect('javascript:alert(1)').error).toContain(
        `the 'javascript:' protocol is not supported as a redirect target`,
      );
      expect(
        normalizeAndValidateRedirect('data:text/html,<script>alert(1)</script>').error,
      ).toContain(`the 'data:' protocol is not supported as a redirect target`);
      expect(normalizeAndValidateRedirect('JaVaScRiPt:alert(1)').error).toContain(
        `the 'javascript:' protocol is not supported as a redirect target`,
      );
    });

    it('should detect the scheme of a target which is padded with whitespace', () => {
      // The URL parser strips leading whitespace and control characters before applying the scheme
      // grammar, so these carry a scheme even though they do not start with one.
      expect(normalizeAndValidateRedirect(' javascript:alert(1)').error).toContain(
        `the 'javascript:' protocol is not supported as a redirect target`,
      );
      expect(normalizeAndValidateRedirect('\tdata:text/html,x').error).toContain(
        `the 'data:' protocol is not supported as a redirect target`,
      );
      expect(normalizeAndValidateRedirect(' https://example.com/docs')).toEqual({
        url: 'https://example.com/docs',
      });
    });

    it('should reject an absolute target which cannot be parsed', () => {
      expect(normalizeAndValidateRedirect('http://').error).toContain(
        `'http://' could not be parsed as a URL.`,
      );
    });

    it('should reject protocol-relative and backslash targets', () => {
      expect(normalizeAndValidateRedirect('//evil.example').error).toContain(
        `Protocol-relative paths ('//') and backslashes ('\\') are not supported.`,
      );
      expect(normalizeAndValidateRedirect('/\\evil.example').error).toContain(
        `Protocol-relative paths ('//') and backslashes ('\\') are not supported.`,
      );
    });

    it('should reject a target which the parser resolves into a protocol-relative path', () => {
      // Resolving the dot segments produces a leading `//`, which the raw value did not have and
      // which leaves the origin unchanged, so it has to be rejected on the resolved path.
      for (const target of [
        '/..//evil.example',
        './/evil.example',
        '/docs/../..//evil.example',
        '/%2e%2e//evil.example',
      ]) {
        expect(normalizeAndValidateRedirect(target).error)
          .withContext(target)
          .toContain(`It resolves to the protocol-relative path '//evil.example'.`);
      }
    });
  });
});
