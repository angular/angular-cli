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
import { Schema as ComponentOptions } from '../component/schema';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as GenerateLibrarySchema } from './schema';

function getJsonFileContent(tree: UnitTestTree, path: string) {
  return JSON.parse(tree.readContent(path));
}

// tslint:disable:max-line-length
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

  it('should create a tsconfig for library', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const fileContent = getJsonFileContent(tree, '/projects/foo/tsconfig.lib.json');
    expect(fileContent).toBeDefined();
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

  it(`should add library to workspace`, () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = getJsonFileContent(tree, '/angular.json');
    expect(workspace.projects.foo).toBeDefined();
    expect(workspace.defaultProject).toBe('foo');
  });

  it('should set the prefix to lib if none is set', () => {
    const tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('lib');
  });

  it('should set the prefix correctly', () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = schematicRunner.runSchematic('library', options, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
  });

  it('should handle a pascalCasedName', () => {
    const options = {...defaultOptions, name: 'pascalCasedName'};
    const tree = schematicRunner.runSchematic('library', options, workspaceTree);
    const config = getJsonFileContent(tree, '/angular.json');
    const project = config.projects.pascalCasedName;
    expect(project).toBeDefined();
    expect(project.root).toEqual('projects/pascal-cased-name');
    const svcContent = tree.readContent('/projects/pascal-cased-name/src/lib/pascal-cased-name.service.ts');
    expect(svcContent).toMatch(/providedIn: 'root'/);
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
      expect(packageJson.devDependencies['ng-packagr']).toEqual('^3.0.0');
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
      expect(tsConfigJson.compilerOptions.paths['foo/*']).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths['foo/*'].length).toEqual(1);
      expect(tsConfigJson.compilerOptions.paths['foo/*'][0]).toEqual('dist/foo/*');
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

  it('should generate inside of a library', () => {
    let tree = schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const componentOptions: ComponentOptions = {
      name: 'comp',
      project: 'foo',
    };
    tree = schematicRunner.runSchematic('component', componentOptions, tree);
    expect(tree.exists('/projects/foo/src/lib/comp/comp.component.ts')).toBe(true);
  });

  it(`should support creating scoped libraries`, () => {
    const scopedName = '@myscope/mylib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = schematicRunner.runSchematic('library', options, workspaceTree);

    const pkgJsonPath = '/projects/myscope/mylib/package.json';
    expect(tree.files).toContain(pkgJsonPath);
    expect(tree.files).toContain('/projects/myscope/mylib/src/lib/mylib.module.ts');
    expect(tree.files).toContain('/projects/myscope/mylib/src/lib/mylib.component.ts');

    const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
    expect(pkgJson.name).toEqual(scopedName);

    const tsConfigJson = JSON.parse(tree.readContent('/projects/myscope/mylib/tsconfig.spec.json'));
    expect(tsConfigJson.extends).toEqual('../../../tsconfig.json');

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myscope/mylib']).toBeDefined();

    const rootTsCfg = JSON.parse(tree.readContent('/tsconfig.json'));
    expect(rootTsCfg.compilerOptions.paths['@myscope/mylib']).toEqual(['dist/myscope/mylib']);
  });

  it(`should dasherize scoped libraries`, () => {
    const scopedName = '@myScope/myLib';
    const expectedScopeName = '@my-scope/my-lib';
    const expectedFolderName = 'my-scope/my-lib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = schematicRunner.runSchematic('library', options, workspaceTree);

    const pkgJsonPath = '/projects/my-scope/my-lib/package.json';
    expect(tree.readContent(pkgJsonPath)).toContain(expectedScopeName);

    const ngPkgJsonPath = '/projects/my-scope/my-lib/ng-package.json';
    expect(tree.readContent(ngPkgJsonPath)).toContain(expectedFolderName);

    const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
    expect(pkgJson.name).toEqual(expectedScopeName);

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myScope/myLib']).toBeDefined();
  });
});
