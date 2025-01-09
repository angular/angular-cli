/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  InvalidPathException,
  Path,
  PathFragment,
  asWindowsPath,
  basename,
  dirname,
  join,
  normalize,
  relative,
  split,
} from './path';

describe('path', () => {
  it('normalize', () => {
    expect(normalize('////')).toBe('/');
    expect(normalize('././././.')).toBe('');
    expect(normalize('/./././.')).toBe('/');

    // Regular use cases.
    expect(normalize('a')).toBe('a');
    expect(normalize('a/b/c')).toBe('a/b/c');
    expect(normalize('/a/b/c')).toBe('/a/b/c');
    expect(normalize('./a/b/c')).toBe('a/b/c');
    expect(normalize('/./a/b/c')).toBe('/a/b/c');
    expect(normalize('/./a/b/c/')).toBe('/a/b/c');
    expect(normalize('/./a/b/./c')).toBe('/a/b/c');
    expect(normalize('./a/b/./c')).toBe('a/b/c');
    expect(normalize('/./a/b/d/../c')).toBe('/a/b/c');
    expect(normalize('/./a/b/./d/../c')).toBe('/a/b/c');
    expect(normalize('././a/b/./d/../c')).toBe('a/b/c');
    expect(normalize('a/')).toBe('a');
    expect(normalize('a/./..')).toBe('');

    // Reducing to nothing use cases.
    expect(normalize('')).toBe('');
    expect(normalize('.')).toBe('');
    expect(normalize('/.')).toBe('/');
    expect(normalize('/./.')).toBe('/');
    expect(normalize('/././.')).toBe('/');
    expect(normalize('/c/..')).toBe('/');

    // Out of directory.
    expect(normalize('..')).toBe('..');
    expect(normalize('../..')).toBe('../..');
    expect(normalize('../../a')).toBe('../../a');
    expect(normalize('b/../../a')).toBe('../a');
    expect(normalize('./..')).toBe('..');
    expect(normalize('../a/b/c')).toBe('../a/b/c');
    expect(normalize('./a/../../a/b/c')).toBe('../a/b/c');

    // Invalid use cases.
    expect(() => normalize('/./././../././/')).toThrow(new InvalidPathException('/./././../././/'));
    expect(() => normalize('/./././../././/../')).toThrow(
      new InvalidPathException('/./././../././/../'),
    );
    expect(() => normalize('/./././../././a/.')).toThrow(
      new InvalidPathException('/./././../././a/.'),
    );

    expect(() => normalize('/c/../../')).toThrow(new InvalidPathException('/c/../../'));

    // Windows use cases.
    expect(normalize('a\\b\\c')).toBe('a/b/c');
    expect(normalize('\\a\\b\\c')).toBe('/a/b/c');
    expect(normalize('.\\a\\b\\c')).toBe('a/b/c');
    expect(normalize('C:\\a\\b\\c')).toBe('/C/a/b/c');
    expect(normalize('c:\\a\\b\\c')).toBe('/C/a/b/c');
    expect(normalize('A:\\a\\b\\c')).toBe('/A/a/b/c');
    expect(() => normalize('A:\\..\\..')).toThrow(new InvalidPathException('A:\\..\\..'));
    expect(normalize('\\.\\a\\b\\c')).toBe('/a/b/c');
    expect(normalize('\\.\\a\\b\\.\\c')).toBe('/a/b/c');
    expect(normalize('\\.\\a\\b\\d\\..\\c')).toBe('/a/b/c');
    expect(normalize('\\.\\a\\b\\.\\d\\..\\c')).toBe('/a/b/c');
    expect(normalize('a\\')).toBe('a');
  });

  describe('split', () => {
    const tests: [string, string[]][] = [
      ['a', ['a']],
      ['/a/b', ['', 'a', 'b']],
      ['a/b', ['a', 'b']],
      ['a/b/', ['a', 'b']],
      ['', []],
      ['/', ['']],
    ];

    for (const [input, result] of tests) {
      const normalizedInput = normalize(input);

      it(`(${JSON.stringify(normalizedInput)}) == "${result}"`, () => {
        expect(split(normalizedInput)).toEqual(result as PathFragment[]);
      });
    }
  });

  describe('join', () => {
    const tests: [string[], string][] = [
      [['a'], 'a'],
      [['/a', '/b'], '/a/b'],
      [['/a', '/b', '/c'], '/a/b/c'],
      [['/a', 'b', 'c'], '/a/b/c'],
      [['a', 'b', 'c'], 'a/b/c'],
    ];

    for (const [input, result] of tests) {
      const args = input.map((x) => normalize(x)) as [Path, ...Path[]];

      it(`(${JSON.stringify(args)}) == "${result}"`, () => {
        expect(join(...args)).toBe(result);
      });
    }
  });

  describe('relative', () => {
    const tests = [
      ['/a/b/c', '/a/b/c', ''],
      ['/a/b', '/a/b/c', 'c'],
      ['/a/b', '/a/b/c/d', 'c/d'],
      ['/a/b/c', '/a/b', '..'],
      ['/a/b/c', '/a/b/d', '../d'],
      ['/a/b/c/d/e', '/a/f/g', '../../../../f/g'],
      ['/src/app/sub1/test1', '/src/app/sub2/test2', '../../sub2/test2'],
      ['/', '/a/b/c', 'a/b/c'],
      ['/a/b/c', '/d', '../../../d'],
      ['E:\\abc', 'e:\\abc\\def', 'def'],
    ];

    for (const [from, to, result] of tests) {
      it(`("${from}", "${to}") == "${result}"`, () => {
        const f = normalize(from);
        const t = normalize(to);

        expect(relative(f, t)).toBe(result);
        expect(join(f, relative(f, t))).toBe(t);
      });
    }
  });

  it('dirname', () => {
    expect(dirname(normalize('a'))).toBe('');
    expect(dirname(normalize('/a'))).toBe('/');
    expect(dirname(normalize('/a/b/c'))).toBe('/a/b');
    expect(dirname(normalize('./c'))).toBe('');
    expect(dirname(normalize('./a/b/c'))).toBe('a/b');
  });

  it('basename', () => {
    expect(basename(normalize('a'))).toBe('a');
    expect(basename(normalize('/a/b/c'))).toBe('c');
    expect(basename(normalize('./c'))).toBe('c');
    expect(basename(normalize('.'))).toBe('');
    expect(basename(normalize('./a/b/c'))).toBe('c');
  });

  it('asWindowsPath', () => {
    expect(asWindowsPath(normalize('c:/'))).toBe('C:\\');
    expect(asWindowsPath(normalize('c:/b/'))).toBe('C:\\b');
    expect(asWindowsPath(normalize('c:/b/c'))).toBe('C:\\b\\c');
  });
});
