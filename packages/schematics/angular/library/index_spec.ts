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
  stringToFileBuffer,
} from '../../../angular_devkit/core/src/virtual-fs/host';
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

  it('should create files', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    const files = tree.files;
    expect(tree.files.length).toEqual(11);
    expect(files.indexOf('/my-libs/foo/karma.conf.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/ng-package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/test.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/my_index.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/foo.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/foo.component.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/foo.service.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/my-libs/foo/src/foo.service.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create a package.json named "foo"', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    const fileContent = getFileContent(tree, '/my-libs/foo/package.json');
    expect(fileContent).toMatch(/"name": "foo"/);
  });

  it('should create a ng-package.json with ngPackage conf', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions);
    const fileContent = getJsonFileContent(tree, '/my-libs/foo/ng-package.json');
    expect(fileContent.ngPackage).toBeDefined();
    expect(fileContent.ngPackage.lib.entryFile).toEqual('src/my_index.ts');
  });

  it('should use default value for baseDir and entryFile', () => {
    const tree = schematicRunner.runSchematic('library', {
      name: 'foobar',
    });
    expect(tree.files.indexOf('/lib/foobar/src/public_api.ts')).toBeGreaterThanOrEqual(0);
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
