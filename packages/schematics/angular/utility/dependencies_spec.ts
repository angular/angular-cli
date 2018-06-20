/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency,
  getLatestNodeVersion,
  getPackageJsonDependency,
} from './dependencies';

const nock = require('nock');

describe('dependencies', () => {
  describe('addDependency', () => {
    let tree: UnitTestTree;
    const pkgJsonPath = '/package.json';
    let dependency: NodeDependency;
    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(pkgJsonPath, '{}');

      dependency = {
        type: NodeDependencyType.Default,
        name: 'my-pkg',
        version: '1.2.3',
      };
    });

    [
      { type: NodeDependencyType.Default, key: 'dependencies' },
      { type: NodeDependencyType.Dev, key: 'devDependencies' },
      { type: NodeDependencyType.Optional, key: 'optionalDependencies' },
      { type: NodeDependencyType.Peer, key: 'peerDependencies' },
    ].forEach(type => {
      describe(`Type: ${type.toString()}`, () => {
        beforeEach(() => {
          dependency.type = type.type;
        });

        it('should add a dependency', () => {
          addPackageJsonDependency(tree, dependency);
          const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
          expect(pkgJson[type.key][dependency.name]).toEqual(dependency.version);
        });

        it('should handle an existing dependency (update version)', () => {
          addPackageJsonDependency(tree, {...dependency, version: '0.0.0'});
          addPackageJsonDependency(tree, {...dependency, overwrite: true});
          const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
          expect(pkgJson[type.key][dependency.name]).toEqual(dependency.version);
        });
      });
    });

    it('should throw when missing package.json', () => {
      expect((() => addPackageJsonDependency(new EmptyTree(), dependency))).toThrow();
    });

  });

  describe('getDependency', () => {
    let tree: UnitTestTree;
    beforeEach(() => {
      const pkgJsonPath = '/package.json';
      const pkgJsonContent = JSON.stringify({
        dependencies: {
          'my-pkg': '1.2.3',
        },
      }, null, 2);
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

  describe('getLatestNodeVersion', () => {
    const packageName = 'my-pkg';

    describe('when a package is found in the registry', () => {
      it('should return a NodePackage with name & the "latest" version', (done) => {
        nock('http://registry.npmjs.org')
          .get(`/${packageName}`)
          .reply(200, registryResponse());

        getLatestNodeVersion(packageName)
          .then(({ name, version }) => {
            expect(name).toEqual(packageName);
            expect(version).toEqual('2.0.0');
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when a package cannot be found in the registry', () => {
      it('should return a NodePackage with a "latest" version', (done) => {
        nock('http://registry.npmjs.org')
          .get(`/${packageName}`)
          .reply(200, {});

        getLatestNodeVersion(packageName)
          .then(({ name, version }) => {
            expect(name).toEqual(packageName);
            expect(version).toEqual('latest');
            done();
          })
          .catch(done.fail);
      });
    });

    describe('when network requests are unavailable', () => {
      it('should return a NodePackage with a "latest" version', (done) => {
        nock('http://registry.npmjs.org')
          .get(`/${packageName}`)
          .reply(404, {});

        getLatestNodeVersion(packageName)
          .then(({ name, version }) => {
            expect(name).toEqual(packageName);
            expect(version).toEqual('latest');
            done();
          })
          .catch(done.fail);
      });
    });

    function registryResponse() {
      return {
        '_id': 'my-pkg',
        '_rev': '213-08cfb20d625bfb265385af8eab6e4381',
        'name': 'my-pkg',
        'dist-tags': {
          'latest': '2.0.0',
          'next': '2.1.0-beta.1',
          'v1-lts': '1.3.0',
        },
      };
    }
  });
});
