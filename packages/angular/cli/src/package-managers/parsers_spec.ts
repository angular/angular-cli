/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { parseNpmLikeError, parseYarnClassicError } from './parsers';

describe('parsers', () => {
  describe('parseNpmLikeError', () => {
    it('should parse a structured JSON error from modern yarn', () => {
      const stdout = JSON.stringify({
        code: 'ERR_PNPM_NO_SUCH_PACKAGE',
        summary: 'No such package.',
        detail: 'Package not found.',
      });
      const error = parseNpmLikeError(stdout);
      expect(error).toEqual({
        code: 'ERR_PNPM_NO_SUCH_PACKAGE',
        summary: 'No such package.',
        detail: 'Package not found.',
      });
    });

    it('should parse a plain text error from npm', () => {
      const stdout =
        'npm error code E404\nnpm error 404 Not Found - GET https://registry.example.com/non-existent-package';
      const error = parseNpmLikeError(stdout);
      expect(error).toEqual({
        code: 'E404',
        summary: '404 Not Found - GET https://registry.example.com/non-existent-package',
      });
    });

    it('should parse a plain text error from npm with ERR!', () => {
      const stderr =
        'npm ERR! code E404\nnpm ERR! 404 Not Found - GET https://registry.example.com/non-existent-package';
      const error = parseNpmLikeError(stderr);
      expect(error).toEqual({
        code: 'E404',
        summary: '404 Not Found - GET https://registry.example.com/non-existent-package',
      });
    });

    it('should parse a structured JSON error with a message property', () => {
      const stderr = JSON.stringify({
        code: 'EUNSUPPORTEDPROTOCOL',
        message: 'Unsupported protocol.',
        detail: 'The protocol "invalid:" is not supported.',
      });
      const error = parseNpmLikeError(stderr);
      expect(error).toEqual({
        code: 'EUNSUPPORTEDPROTOCOL',
        summary: 'Unsupported protocol.',
        detail: 'The protocol "invalid:" is not supported.',
      });
    });

    it('should return null for empty stdout', () => {
      const error = parseNpmLikeError('');
      expect(error).toBeNull();
    });

    it('should return null for unparsable stdout', () => {
      const error = parseNpmLikeError('An unexpected error occurred.');
      expect(error).toBeNull();
    });
  });

  describe('parseYarnClassicError', () => {
    it('should parse a 404 from verbose logs', () => {
      const stdout =
        '{"type":"verbose","data":"Request "https://registry.example.com/non-existent-package" finished with status code 404."}';
      const error = parseYarnClassicError(stdout);
      expect(error).toEqual({
        code: 'E404',
        summary: 'Request failed with status code 404.',
      });
    });

    it('should parse a non-404 HTTP error from verbose logs', () => {
      const stdout =
        '{"type":"verbose","data":"Request "https://registry.example.com/private-package" finished with status code 401."}';
      const error = parseYarnClassicError(stdout);
      expect(error).toEqual({
        code: 'E401',
        summary: 'Request failed with status code 401.',
      });
    });

    it('should parse a generic JSON error when no HTTP status is found', () => {
      const stdout = '{"type":"error","data":"An unexpected error occurred."}';
      const error = parseYarnClassicError(stdout);
      expect(error).toEqual({
        code: 'UNKNOWN_ERROR',
        summary: 'An unexpected error occurred.',
      });
    });

    it('should return null for empty stdout', () => {
      const error = parseYarnClassicError('');
      expect(error).toBeNull();
    });

    it('should return null for unparsable stdout', () => {
      const error = parseYarnClassicError('A random error message.');
      expect(error).toBeNull();
    });
  });
});
