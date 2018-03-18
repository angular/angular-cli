/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { HostTree, Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import {
  SimpleMemoryHost,
  stringToFileBuffer } from '../../../angular_devkit/core/src/virtual-fs/host';
import { getFileContent } from '../../angular/utility/test';
import { Schema as GenerateLibrarySchema } from './schema';

function getJsonFileContent(tree: Tree, path: string) {
  return JSON.parse(getFileContent(tree, path));
}

describe('Library Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/ng_packagr',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: GenerateLibrarySchema = {
    name: 'foo',
    baseDir: 'my-libs',
    entryFile: 'my_index.ts',
  };

  it('should create entryFile', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    expect(tree.files.length).toEqual(2);
    expect(tree.files[1]).toEqual('/my-libs/foo/my_index.ts');
  });

  it('should create a package.json named "foo"', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    const fileContent = getFileContent(tree, '/my-libs/foo/package.json');
    expect(fileContent).toMatch(/"name": "foo"/);
  });

  it('should create a package.json with ngPackage conf', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    const fileContent = getJsonFileContent(tree, '/my-libs/foo/package.json');
    expect(fileContent.ngPackage).toBeDefined();
    expect(fileContent.ngPackage.lib.entryFile).toEqual('my_index.ts');
  });

  it('should use default value for sourceDir and entryFile', () => {
    const tree = schematicRunner.runSchematic('library', {
      name: 'foobar',
    });
    expect(tree.files.length).toEqual(2);
    expect(tree.files[1]).toEqual('/lib/foobar/public_api.ts');
  });

  describe(`update tsconfig.json`, () => {
    let mockTree: Tree;
    beforeEach(() => {
      mockTree = new VirtualTree();
      mockTree.create('tsconfig.json', JSON.stringify({
        compilerOptions: {
          target: 'es2015',
          module: 'es2015',
        },
      }));
    });

    it(`should add paths mapping to empty tsconfig`, () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, mockTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(1);
      expect(tsConfigJson.compilerOptions.paths.foo[0]).toEqual('my-libs/foo/my_index.ts');
    });

    it(`should append to existing paths mappings`, () => {
      mockTree.overwrite('tsconfig.json', JSON.stringify({
        compilerOptions: {
          target: 'es2015',
          module: 'es2015',
          paths: {
            'unrelated': ['./something/else.ts'],
            'foo': ['libs/*'],
          },
        },
      }));
      const tree = schematicRunner.runSchematic('library', defaultOptions, mockTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(2);
      expect(tsConfigJson.compilerOptions.paths.foo[1]).toEqual('my-libs/foo/my_index.ts');
    });

    it(`should not modify the file when --skipTsConfig`, () => {
      const tree = schematicRunner.runSchematic('library', {
        name: 'foo',
        skipTsConfig: true,
      }, mockTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
    });
  });

  describe(`update package.json`, () => {
    let mockTree: VirtualTree;
    let memoryfs: SimpleMemoryHost;
    beforeEach(() => {
      memoryfs = new SimpleMemoryHost();
      memoryfs.write(normalize('/package.json'), stringToFileBuffer(JSON.stringify({
        devDependencies: {
          typescript: '~2.5.0',
        },
      }))).subscribe();
      mockTree = new HostTree(memoryfs);
    });

    it(`should add ng-packagr to devDependencies`, () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, mockTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toEqual('^2.2.0');
      // TODO ...
    });

    it(`should not override existing users dependencies`, () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, mockTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.0');
    });

    it(`should not modify the file when --skipPackageJson`, () => {
      const tree = schematicRunner.runSchematic('library', {
        name: 'foo',
        skipPackageJson: true,
      }, mockTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
    });
  });
});
