/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {InvalidPathException, normalizePath} from './path';


describe('normalizePath', () => {
  it('works', () => {
    // Regular use cases.
    expect(normalizePath('a/b/c')).toBe('/a/b/c');
    expect(normalizePath('/a/b/c')).toBe('/a/b/c');
    expect(normalizePath('./a/b/c')).toBe('/a/b/c');
    expect(normalizePath('/./a/b/c')).toBe('/a/b/c');
    expect(normalizePath('/./a/b/./c')).toBe('/a/b/c');
    expect(normalizePath('/./a/b/d/../c')).toBe('/a/b/c');
    expect(normalizePath('/./a/b/./d/../c')).toBe('/a/b/c');

    // Reducing to nothing use cases.
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('.')).toBe('/');
    expect(normalizePath('/.')).toBe('/');
    expect(normalizePath('/./.')).toBe('/');
    expect(normalizePath('/././.')).toBe('/');
    expect(normalizePath('/./././../././/../')).toBe('/');
    expect(normalizePath('/./././../././/')).toBe('/');

    // Directories use cases.
    expect(() => normalizePath('/./././../././a/.'))
      .toThrow(new InvalidPathException('/./././../././a/.'));
    expect(() => normalizePath('a/')).toThrow(new InvalidPathException('a/'));
    expect(() => normalizePath('a/./..')).toThrow(new InvalidPathException('a/./..'));

    expect(() => normalizePath('../a/b/c')).toThrow(new InvalidPathException('../a/b/c'));
    expect(() => normalizePath('/c/..')).toThrow(new InvalidPathException('/c/..'));
    expect(() => normalizePath('/c/../../')).toThrow(new InvalidPathException('/c/../../'));
  });
});