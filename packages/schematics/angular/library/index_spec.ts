/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { getFileContent } from '../../angular/utility/test';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as GenerateLibrarySchema } from './schema';

function getJsonFileContent(tree: UnitTestTree, path: string) {
  return JSON.parse(tree.readContent(path));
}

describe('Library Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/ng_packagr',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: GenerateLibrarySchema = {
    name: 'foo',
    entryFile: 'my_index',
    skipPackageJson: false,
    skipTsConfig: false,
  };
  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  let workspaceTree: UnitTestTree;
  beforeEach(() => {
    workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create files', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/projects/foo/karma.conf.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/ng-package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/tslint.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/test.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/my_index.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/lib/foo.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/lib/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/lib/foo.component.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/lib/foo.service.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/lib/foo.service.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create a package.json named "foo"', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const fileContent = getFileContent(tree, '/projects/foo/package.json');
    expect(fileContent).toMatch(/"name": "foo"/);
  });

  it('should create a ng-package.json with ngPackage conf', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const fileContent = getJsonFileContent(tree, '/projects/foo/ng-package.json');
    expect(fileContent.lib).toBeDefined();
    expect(fileContent.lib.entryFile).toEqual('src/my_index.ts');
    expect(fileContent.deleteDestPath).toEqual(false);
    expect(fileContent.dest).toEqual('../../dist/foo');
  });

  it('should use default value for baseDir and entryFile', () => {
    const tree = schematicRunner.runSchematic('library', {
      name: 'foobar',
    }, workspaceTree);
    expect(tree.files.indexOf('/projects/foobar/src/public_api.ts')).toBeGreaterThanOrEqual(0);
  });

  it(`should add library workspace`, () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = getJsonFileContent(tree, '/angular.json');
    expect(workspace.projects.foo).toBeDefined();
  });

  it('should export the component in the NgModule', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const fileContent = getFileContent(tree, '/projects/foo/src/lib/foo.module.ts');
    expect(fileContent).toContain('exports: [FooComponent]');
  });

  it('should set the right path and prefix in the tslint file', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.extends).toMatch('../../tslint.json');
    expect(content.rules['directive-selector'][2]).toMatch('lib');
    expect(content.rules['component-selector'][2]).toMatch('lib');
  });

  describe(`update package.json`, () => {
    it(`should add ng-packagr to devDependencies`, () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toEqual('^2.4.1');
      expect(packageJson.devDependencies['@angular-devkit/build-ng-packagr'])
        .toEqual(latestVersions.DevkitBuildNgPackagr);
    });

    it('should use the latest known versions in package.json', () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
      const pkg = JSON.parse(tree.readContent('/package.json'));
      expect(pkg.devDependencies['@angular/compiler-cli']).toEqual(latestVersions.Angular);
      expect(pkg.devDependencies['typescript']).toEqual(latestVersions.TypeScript);
    });

    it(`should not override existing users dependencies`, () => {
      const oldPackageJson = workspaceTree.readContent('package.json');
      workspaceTree.overwrite('package.json', oldPackageJson.replace(
        `"typescript": "${latestVersions.TypeScript}"`,
        `"typescript": "~2.5.2"`,
      ));

      const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, () => {
      const tree = schematicRunner.runSchematic('library', {
        name: 'foo',
        skipPackageJson: true,
      }, workspaceTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });
  });

  describe(`update tsconfig.json`, () => {
    it(`should add paths mapping to empty tsconfig`, () => {
      const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(1);
      expect(tsConfigJson.compilerOptions.paths.foo[0]).toEqual('dist/foo');
    });

    it(`should append to existing paths mappings`, () => {
      workspaceTree.overwrite('tsconfig.json', JSON.stringify({
        compilerOptions: {
          paths: {
            'unrelated': ['./something/else.ts'],
            'foo': ['libs/*'],
          },
        },
      }));
      const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(2);
      expect(tsConfigJson.compilerOptions.paths.foo[1]).toEqual('dist/foo');
    });

    it(`should not modify the file when --skipTsConfig`, () => {
      const tree = schematicRunner.runSchematic('library', {
        name: 'foo',
        skipTsConfig: true,
      }, workspaceTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
    });
  });
});
