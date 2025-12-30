/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  parseBunDependencies,
  parseNpmLikeError,
  parseNpmLikeManifest,
  parseYarnClassicDependencies,
  parseYarnClassicError,
  parseYarnModernDependencies,
} from './parsers';

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

  describe('parseNpmLikeManifest', () => {
    it('should parse a single manifest', () => {
      const stdout = JSON.stringify({ name: 'foo', version: '1.0.0' });
      expect(parseNpmLikeManifest(stdout)).toEqual({ name: 'foo', version: '1.0.0' });
    });

    it('should return the last manifest from an array', () => {
      const stdout = JSON.stringify([
        { name: 'foo', version: '1.0.0' },
        { name: 'foo', version: '1.1.0' },
      ]);
      expect(parseNpmLikeManifest(stdout)).toEqual({ name: 'foo', version: '1.1.0' });
    });

    it('should return null for empty stdout', () => {
      expect(parseNpmLikeManifest('')).toBeNull();
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

  describe('parseYarnClassicDependencies', () => {
    it('should parse yarn classic list output', () => {
      const stdout = JSON.stringify({
        type: 'tree',
        data: {
          trees: [{ name: 'rxjs@7.8.2', children: [] }],
        },
      });

      const deps = parseYarnClassicDependencies(stdout);
      expect(deps.size).toBe(1);
      expect(deps.get('rxjs')).toEqual({ name: 'rxjs', version: '7.8.2' });
    });

    it('should handle scoped packages', () => {
      const stdout = JSON.stringify({
        type: 'tree',
        data: {
          trees: [{ name: '@angular/core@18.0.0', children: [] }],
        },
      });

      const deps = parseYarnClassicDependencies(stdout);
      expect(deps.size).toBe(1);
      expect(deps.get('@angular/core')).toEqual({ name: '@angular/core', version: '18.0.0' });
    });

    it('should return empty map for empty stdout', () => {
      expect(parseYarnClassicDependencies('').size).toBe(0);
    });
  });

  describe('parseBunDependencies', () => {
    it('should parse bun pm ls output', () => {
      const stdout = `
/tmp/angular-cli-e2e-PiL5n3/e2e-test/assets/19.0-project-1767113081927 node_modules (1084)
├── @angular-devkit/build-angular@20.3.13
├── @angular/cli@20.3.13
├── jasmine-core @5.6.0
├── rxjs @7.8.2
└── zone.js @0.15.1
`.trim();

      const deps = parseBunDependencies(stdout);
      expect(deps.size).toBe(5);
      expect(deps.get('@angular-devkit/build-angular')).toEqual({
        name: '@angular-devkit/build-angular',
        version: '20.3.13',
      });
      expect(deps.get('@angular/cli')).toEqual({ name: '@angular/cli', version: '20.3.13' });
      expect(deps.get('jasmine-core')).toEqual({ name: 'jasmine-core', version: '5.6.0' });
      expect(deps.get('rxjs')).toEqual({ name: 'rxjs', version: '7.8.2' });
      expect(deps.get('zone.js')).toEqual({ name: 'zone.js', version: '0.15.1' });
    });

    it('should return empty map for empty stdout', () => {
      expect(parseBunDependencies('').size).toBe(0);
    });

    it('should skip lines that do not match the pattern', () => {
      const stdout = `
project node_modules
├── invalid-line
└── another-invalid
`.trim();
      expect(parseBunDependencies(stdout).size).toBe(0);
    });
  });

  describe('parseYarnModernDependencies', () => {
    it('should parse yarn info --name-only --json output', () => {
      const stdout = `
"karma@npm:6.4.4"
"rxjs@npm:7.8.2"
"tslib@npm:2.8.1"
"typescript@patch:typescript@npm%3A5.9.3#optional!builtin<compat/typescript>::version=5.9.3&hash=5786d5"
`.trim();

      const deps = parseYarnModernDependencies(stdout);
      expect(deps.size).toBe(4);
      expect(deps.get('karma')).toEqual({ name: 'karma', version: '6.4.4' });
      expect(deps.get('rxjs')).toEqual({ name: 'rxjs', version: '7.8.2' });
      expect(deps.get('tslib')).toEqual({ name: 'tslib', version: '2.8.1' });
      expect(deps.get('typescript')).toEqual({
        name: 'typescript',
        version: '5.9.3',
      });
    });

    it('should handle scoped packages', () => {
      const stdout = '"@angular/core@npm:20.3.15"';
      const deps = parseYarnModernDependencies(stdout);
      expect(deps.get('@angular/core')).toEqual({
        name: '@angular/core',
        version: '20.3.15',
      });
    });

    it('should return empty map for empty stdout', () => {
      expect(parseYarnModernDependencies('').size).toBe(0);
    });
  });
});
