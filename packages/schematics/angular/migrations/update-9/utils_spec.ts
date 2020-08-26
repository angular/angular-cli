
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HostTree } from '@angular-devkit/schematics';
import { isIvyEnabled } from './utils';

describe('migrations update-9 utils', () => {
  describe('isIvyEnabled', () => {
    let tree: HostTree;

    beforeEach(() => {
      tree = new HostTree();
    });

    it('should return false when disabled in base tsconfig', () => {
      tree.create('tsconfig.json', JSON.stringify({
        angularCompilerOptions: {
          enableIvy: false,
        },
      }));

      tree.create('foo/tsconfig.app.json', JSON.stringify({
        extends: '../tsconfig.json',
      }));

      expect(isIvyEnabled(tree, 'foo/tsconfig.app.json')).toBe(false);
    });

    it('should return true when enable in child tsconfig but disabled in base tsconfig', () => {
      tree.create('tsconfig.json', JSON.stringify({
        angularCompilerOptions: {
          enableIvy: false,
        },
      }));

      tree.create('foo/tsconfig.app.json', JSON.stringify({
        extends: '../tsconfig.json',
        angularCompilerOptions: {
          enableIvy: true,
        },
      }));

      expect(isIvyEnabled(tree, 'foo/tsconfig.app.json')).toBe(true);
    });

    it('should return false when disabled in child tsconfig but enabled in base tsconfig', () => {
      tree.create('tsconfig.json', JSON.stringify({
        angularCompilerOptions: {
          enableIvy: true,
        },
      }));

      tree.create('foo/tsconfig.app.json', JSON.stringify({
        extends: '../tsconfig.json',
        angularCompilerOptions: {
          enableIvy: false,
        },
      }));

      expect(isIvyEnabled(tree, 'foo/tsconfig.app.json')).toBe(false);
    });

    it('should return false when disabled in base with multiple extends', () => {
      tree.create('tsconfig.json', JSON.stringify({
        angularCompilerOptions: {
          enableIvy: false,
        },
      }));

      tree.create('foo/tsconfig.project.json', JSON.stringify({
        extends: '../tsconfig.json',
      }));

      tree.create('foo/tsconfig.app.json', JSON.stringify({
        extends: './tsconfig.project.json',
      }));

      expect(isIvyEnabled(tree, 'foo/tsconfig.app.json')).toBe(false);
    });

    it('should return true when enable in intermediate tsconfig with multiple extends', () => {
      tree.create('tsconfig.json', JSON.stringify({
        angularCompilerOptions: {
          enableIvy: false,
        },
      }));

      tree.create('foo/tsconfig.project.json', JSON.stringify({
        extends: '../tsconfig.json',
        angularCompilerOptions: {
          enableIvy: true,
        },
      }));

      tree.create('foo/tsconfig.app.json', JSON.stringify({
        extends: './tsconfig.project.json',
      }));

      expect(isIvyEnabled(tree, 'foo/tsconfig.app.json')).toBe(true);
    });
  });
});
