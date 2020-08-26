/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { relativePathToWorkspaceRoot } from './paths';

describe('paths', () => {
  describe('relativePathToWorkspaceRoot', () => {
    it(`should handle root '/'`, () => {
      const result = relativePathToWorkspaceRoot('/');
      expect(result).toBe('.');
    });

    it(`should handle an empty path`, () => {
      const result = relativePathToWorkspaceRoot('');
      expect(result).toBe('.');
    });

    it(`should handle an undefined path`, () => {
      const result = relativePathToWorkspaceRoot(undefined);
      expect(result).toBe('.');
    });

    it(`should handle path with trailing '/'`, () => {
      const result = relativePathToWorkspaceRoot('foo/bar/');
      expect(result).toBe('../..');
    });

    it(`should handle path without trailing '/'`, () => {
      const result = relativePathToWorkspaceRoot('foo/bar');
      expect(result).toBe('../..');
    });
  });
});
