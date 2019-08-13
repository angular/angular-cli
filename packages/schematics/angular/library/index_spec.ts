/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '../../angular/utility/test';
import { Schema as ComponentOptions } from '../component/schema';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as GenerateLibrarySchema } from './schema';

function getJsonFileContent(tree: UnitTestTree, path: string) {
  return JSON.parse(tree.readContent(path));
}

describe('Library Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/ng_packagr',
    require.resolve('../collection.json'),
  );
  const defaultOptions: GenerateLibrarySchema = {
    name: 'foo',
    entryFile: 'my-index',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
  };
  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  let workspaceTree: UnitTestTree;
  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
  });

  it('should create files', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const files = tree.files;
    expect(files).toEqual(jasmine.arrayContaining([
      '/projects/foo/karma.conf.js',
      '/projects/foo/ng-package.json',
      '/projects/foo/package.json',
      '/projects/foo/README.md',
      '/projects/foo/tslint.json',
      '/projects/foo/tsconfig.lib.json',
      '/projects/foo/tsconfig.lib.prod.json',
      '/projects/foo/src/test.ts',
      '/projects/foo/src/my-index.ts',
      '/projects/foo/src/lib/foo.module.ts',
      '/projects/foo/src/lib/foo.component.spec.ts',
      '/projects/foo/src/lib/foo.component.ts',
      '/projects/foo/src/lib/foo.service.spec.ts',
      '/projects/foo/src/lib/foo.service.ts',
    ]));
  });

  it('should create a package.json named "foo"', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getFileContent(tree, '/projects/foo/package.json');
    expect(fileContent).toMatch(/"name": "foo"/);
  });

  it('should have the latest Angular major versions in package.json named "foo"', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getJsonFileContent(tree, '/projects/foo/package.json');
    const angularVersion = latestVersions.Angular.replace('~', '').replace('^', '');
    expect(fileContent.peerDependencies['@angular/core']).toBe(`^${angularVersion}`);
  });

  it('should create a README.md named "foo"', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getFileContent(tree, '/projects/foo/README.md');
    expect(fileContent).toMatch(/# Foo/);
  });

  it('should create a tsconfig for library', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getJsonFileContent(tree, '/projects/foo/tsconfig.lib.json');
    expect(fileContent).toBeDefined();
  });

  it('should create a ng-package.json with ngPackage conf', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getJsonFileContent(tree, '/projects/foo/ng-package.json');
    expect(fileContent.lib).toBeDefined();
    expect(fileContent.lib.entryFile).toEqual('src/my-index.ts');
    expect(fileContent.dest).toEqual('../../dist/foo');
  });

  it('should use default value for baseDir and entryFile', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', {
      name: 'foobar',
    }, workspaceTree).toPromise();
    expect(tree.files).toContain('/projects/foobar/src/public-api.ts');
  });

  it(`should add library to workspace`, async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();

    const workspace = getJsonFileContent(tree, '/angular.json');
    expect(workspace.projects.foo).toBeDefined();
    expect(workspace.defaultProject).toBe('foo');
  });

  it('should set the prefix to lib if none is set', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('lib');
  });

  it('should set the prefix correctly', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = await schematicRunner.runSchematicAsync('library', options, workspaceTree).toPromise();

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
  });

  it('should set the right prefix in the tslint file when provided is kebabed', async () => {
    const options: GenerateLibrarySchema = { ...defaultOptions, prefix: 'foo-bar' };
    const tree = await schematicRunner.runSchematicAsync('library', options, workspaceTree).toPromise();
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.rules['directive-selector'][2]).toMatch('fooBar');
    expect(content.rules['component-selector'][2]).toMatch('foo-bar');
  });

  it('should handle a pascalCasedName', async () => {
    const options = { ...defaultOptions, name: 'pascalCasedName' };
    const tree = await schematicRunner.runSchematicAsync('library', options, workspaceTree).toPromise();
    const config = getJsonFileContent(tree, '/angular.json');
    const project = config.projects.pascalCasedName;
    expect(project).toBeDefined();
    expect(project.root).toEqual('projects/pascal-cased-name');
    const svcContent = tree.readContent('/projects/pascal-cased-name/src/lib/pascal-cased-name.service.ts');
    expect(svcContent).toMatch(/providedIn: 'root'/);
  });

  it('should export the component in the NgModule', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const fileContent = getFileContent(tree, '/projects/foo/src/lib/foo.module.ts');
    expect(fileContent).toContain('exports: [FooComponent]');
  });

  it('should set the right path and prefix in the tslint file', async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.extends).toMatch('../../tslint.json');
    expect(content.rules['directive-selector'][2]).toMatch('lib');
    expect(content.rules['component-selector'][2]).toMatch('lib');
  });

  describe(`update package.json`, () => {
    it(`should add ng-packagr to devDependencies`, async () => {
      const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toEqual(latestVersions.ngPackagr);
      expect(packageJson.devDependencies['@angular-devkit/build-ng-packagr'])
        .toEqual(latestVersions.DevkitBuildNgPackagr);
    });

    it('should use the latest known versions in package.json', async () => {
      const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
      const pkg = JSON.parse(tree.readContent('/package.json'));
      expect(pkg.devDependencies['@angular/compiler-cli']).toEqual(latestVersions.Angular);
      expect(pkg.devDependencies['typescript']).toEqual(latestVersions.TypeScript);
    });

    it(`should not override existing users dependencies`, async () => {
      const oldPackageJson = workspaceTree.readContent('package.json');
      workspaceTree.overwrite('package.json', oldPackageJson.replace(
        `"typescript": "${latestVersions.TypeScript}"`,
        `"typescript": "~2.5.2"`,
      ));

      const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, async () => {
      const tree = await schematicRunner.runSchematicAsync('library', {
        name: 'foo',
        skipPackageJson: true,
      }, workspaceTree).toPromise();

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });
  });

  describe(`update tsconfig.json`, () => {
    it(`should add paths mapping to empty tsconfig`, async () => {
      const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(1);
      expect(tsConfigJson.compilerOptions.paths.foo[0]).toEqual('dist/foo');
      expect(tsConfigJson.compilerOptions.paths['foo/*']).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths['foo/*'].length).toEqual(1);
      expect(tsConfigJson.compilerOptions.paths['foo/*'][0]).toEqual('dist/foo/*');
    });

    it(`should append to existing paths mappings`, async () => {
      workspaceTree.overwrite('tsconfig.json', JSON.stringify({
        compilerOptions: {
          paths: {
            'unrelated': ['./something/else.ts'],
            'foo': ['libs/*'],
          },
        },
      }));
      const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths.foo).toBeTruthy();
      expect(tsConfigJson.compilerOptions.paths.foo.length).toEqual(2);
      expect(tsConfigJson.compilerOptions.paths.foo[1]).toEqual('dist/foo');
    });

    it(`should not modify the file when --skipTsConfig`, async () => {
      const tree = await schematicRunner.runSchematicAsync('library', {
        name: 'foo',
        skipTsConfig: true,
      }, workspaceTree).toPromise();

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
    });
  });

  it('should generate inside of a library', async () => {
    let tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const componentOptions: ComponentOptions = {
      name: 'comp',
      project: 'foo',
    };
    tree = await schematicRunner.runSchematicAsync('component', componentOptions, tree).toPromise();
    expect(tree.exists('/projects/foo/src/lib/comp/comp.component.ts')).toBe(true);
  });

  it(`should support creating scoped libraries`, async () => {
    const scopedName = '@myscope/mylib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = await schematicRunner.runSchematicAsync('library', options, workspaceTree).toPromise();

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

    const karmaConf = getFileContent(tree, '/projects/myscope/mylib/karma.conf.js');
    expect(karmaConf).toContain(`dir: require('path').join(__dirname, '../../../coverage/myscope/mylib')`);
  });

  it(`should dasherize scoped libraries`, async () => {
    const scopedName = '@myScope/myLib';
    const expectedScopeName = '@my-scope/my-lib';
    const expectedFolderName = 'my-scope/my-lib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = await schematicRunner.runSchematicAsync('library', options, workspaceTree).toPromise();

    const pkgJsonPath = '/projects/my-scope/my-lib/package.json';
    expect(tree.readContent(pkgJsonPath)).toContain(expectedScopeName);

    const ngPkgJsonPath = '/projects/my-scope/my-lib/ng-package.json';
    expect(tree.readContent(ngPkgJsonPath)).toContain(expectedFolderName);

    const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
    expect(pkgJson.name).toEqual(expectedScopeName);

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myScope/myLib']).toBeDefined();
  });

  it(`should set coverage folder to "coverage/foo"`, async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree).toPromise();
    const karmaConf = getFileContent(tree, '/projects/foo/karma.conf.js');
    expect(karmaConf).toContain(`dir: require('path').join(__dirname, '../../coverage/foo')`);
  });

  it(`should create correct paths when 'newProjectRoot' is blank`, async () => {
    const workspaceTree = await schematicRunner.runSchematicAsync('workspace', { ...workspaceOptions, newProjectRoot: '' }).toPromise();
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree)
      .toPromise();
    const config = JSON.parse(tree.readContent('/angular.json'));
    const project = config.projects.foo;
    expect(project.root).toEqual('foo');
    const buildOpt = project.architect.build.options;
    expect(buildOpt.project).toEqual('foo/ng-package.json');
    expect(buildOpt.tsConfig).toEqual('foo/tsconfig.lib.json');

    const appTsConfig = JSON.parse(tree.readContent('/foo/tsconfig.lib.json'));
    expect(appTsConfig.extends).toEqual('../tsconfig.json');
    const specTsConfig = JSON.parse(tree.readContent('/foo/tsconfig.spec.json'));
    expect(specTsConfig.extends).toEqual('../tsconfig.json');
  });

  it(`should add 'production' configuration`, async () => {
    const tree = await schematicRunner.runSchematicAsync('library', defaultOptions, workspaceTree)
      .toPromise();

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.architect.build.configurations.production).toBeDefined();
  });
});
