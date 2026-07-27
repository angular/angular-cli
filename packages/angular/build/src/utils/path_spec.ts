/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { canonicalizePath, isSubDirectory } from './path';

describe('isSubDirectory', () => {
  it('should return true for a direct child', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar/baz')).toBeTrue();
  });

  it('should return true for a nested child', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar/baz/qux/file.txt')).toBeTrue();
  });

  it('should return true if paths are identical', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar')).toBeTrue();
  });

  it('should return false for a sibling directory starting with same prefix', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar-outside')).toBeFalse();
    expect(isSubDirectory('/foo/bar', '/foo/bar-outside/file.txt')).toBeFalse();
  });

  it('should return false for directory outside parent via traversal', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar/../outside')).toBeFalse();
  });

  it('should return false for parent directory', () => {
    expect(isSubDirectory('/foo/bar', '/foo')).toBeFalse();
  });

  it('should return true for children containing directory names starting with double dots', () => {
    expect(isSubDirectory('/foo/bar', '/foo/bar/..baz')).toBeTrue();
    expect(isSubDirectory('/foo/bar', '/foo/bar/..baz/qux')).toBeTrue();
  });
});

describe('canonicalizePath', () => {
  it('should return the path unmodified on POSIX systems', () => {
    expect(canonicalizePath('/foo/bar/baz')).toBe('/foo/bar/baz');
  });

  if (process.platform === 'win32') {
    it('should uppercase Windows drive-letter casing', () => {
      expect(canonicalizePath('c:/foo/bar')).toBe('C:/foo/bar');
      expect(canonicalizePath('d:\\foo\\bar')).toBe('D:\\foo\\bar');
      expect(canonicalizePath('C:/foo/bar')).toBe('C:/foo/bar');
    });
  }
});
