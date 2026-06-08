/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from './dependencies';

describe('dependencies', () => {
  describe('addDependency', () => {
    let tree: UnitTestTree;
    const pkgJsonPath = '/package.json';

    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(pkgJsonPath, '{}');
    });

    [
      { type: NodeDependencyType.Default, key: 'dependencies' },
      { type: NodeDependencyType.Dev, key: 'devDependencies' },
      { type: NodeDependencyType.Optional, key: 'optionalDependencies' },
      { type: NodeDependencyType.Peer, key: 'peerDependencies' },
    ].forEach(({ type, key }) => {
      describe(`Type: ${type}`, () => {
        const dependency: NodeDependency = {
          type,
          name: 'my-pkg',
          version: '1.2.3',
        };

        it('should add a dependency', () => {
          addPackageJsonDependency(tree, dependency);
          const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));

          expect(pkgJson[key][dependency.name]).toEqual(dependency.version);
        });

        it('should handle an existing dependency (update version)', () => {
          addPackageJsonDependency(tree, { ...dependency, version: '0.0.0' });
          addPackageJsonDependency(tree, { ...dependency, overwrite: true });
          const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));

          expect(pkgJson[key][dependency.name]).toEqual(dependency.version);
        });
      });
    });

    it('should throw when missing package.json', () => {
      expect(() =>
        addPackageJsonDependency(new EmptyTree(), {
          type: NodeDependencyType.Default,
          name: 'my-pkg',
          version: '1.2.3',
        }),
      ).toThrow();
    });
  });

  describe('getDependency', () => {
    let tree: UnitTestTree;
    beforeEach(() => {
      const pkgJsonPath = '/package.json';
      const pkgJsonContent = JSON.stringify(
        {
          dependencies: {
            'my-pkg': '1.2.3',
          },
        },
        null,
        2,
      );
      tree = new UnitTestTree(new EmptyTree());
      tree.create(pkgJsonPath, pkgJsonContent);
    });

    it('should get a dependency', () => {
      const dep = getPackageJsonDependency(tree, 'my-pkg') as NodeDependency;
      expect(dep.type).toEqual(NodeDependencyType.Default);
      expect(dep.name).toEqual('my-pkg');
      expect(dep.version).toEqual('1.2.3');
    });

    it('should return null if dependency does not exist', () => {
      const dep = getPackageJsonDependency(tree, 'missing-pkg') as NodeDependency;
      expect(dep).toBeNull();
    });
  });
});
