/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { getFileContent } from '../../angular/utility/test';
import { Schema as ComponentOptions } from '../component/schema';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as GenerateLibrarySchema } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getJsonFileContent(tree: UnitTestTree, path: string): any {
  return parseJson(tree.readContent(path).toString());
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
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create correct files', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/ng-package.json',
        '/projects/foo/package.json',
        '/projects/foo/README.md',
        '/projects/foo/tsconfig.lib.json',
        '/projects/foo/tsconfig.lib.prod.json',
        '/projects/foo/src/my-index.ts',
        '/projects/foo/src/lib/foo.component.spec.ts',
        '/projects/foo/src/lib/foo.component.ts',
        '/projects/foo/src/lib/foo.service.spec.ts',
        '/projects/foo/src/lib/foo.service.ts',
      ]),
    );
  });

  it('should not add reference to module file in entry-file', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    expect(tree.readContent('/projects/foo/src/my-index.ts')).not.toContain('foo.module');
  });

  it('should create a standalone component', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);
    const componentContent = tree.readContent('/projects/foo/src/lib/foo.component.ts');
    expect(componentContent).not.toContain('standalone');
  });

  describe('custom projectRoot', () => {
    const customProjectRootOptions: GenerateLibrarySchema = {
      name: 'foo',
      entryFile: 'my-index',
      skipPackageJson: false,
      skipTsConfig: false,
      skipInstall: false,
      projectRoot: 'some/other/directory/bar',
    };

    it('should create files in /some/other/directory/bar', async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        customProjectRootOptions,
        workspaceTree,
      );

      const files = tree.files;
      expect(files).toEqual(
        jasmine.arrayContaining([
          '/some/other/directory/bar/ng-package.json',
          '/some/other/directory/bar/package.json',
          '/some/other/directory/bar/README.md',
          '/some/other/directory/bar/tsconfig.lib.json',
          '/some/other/directory/bar/tsconfig.lib.prod.json',
          '/some/other/directory/bar/src/my-index.ts',
          '/some/other/directory/bar/src/lib/foo.component.spec.ts',
          '/some/other/directory/bar/src/lib/foo.component.ts',
          '/some/other/directory/bar/src/lib/foo.service.spec.ts',
          '/some/other/directory/bar/src/lib/foo.service.ts',
        ]),
      );
    });

    it(`should add library to workspace`, async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        customProjectRootOptions,
        workspaceTree,
      );

      const workspace = getJsonFileContent(tree, '/angular.json');
      expect(workspace.projects.foo).toBeDefined();
    });
  });

  it('should create a package.json named "foo"', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getFileContent(tree, '/projects/foo/package.json');
    expect(fileContent).toMatch(/"name": "foo"/);
  });

  it('should have the latest Angular major versions in package.json named "foo"', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getJsonFileContent(tree, '/projects/foo/package.json');
    const angularVersion = latestVersions.Angular.replace('~', '').replace('^', '');
    expect(fileContent.peerDependencies['@angular/core']).toBe(`^${angularVersion}`);
  });

  it('should add sideEffects: false flag to package.json named "foo"', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getFileContent(tree, '/projects/foo/package.json');
    expect(fileContent).toMatch(/"sideEffects": false/);
  });

  it('should create a README.md named "foo"', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getFileContent(tree, '/projects/foo/README.md');
    expect(fileContent).toMatch(/# Foo/);
  });

  it('should create a tsconfig for library', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getJsonFileContent(tree, '/projects/foo/tsconfig.lib.json');
    expect(fileContent).toBeDefined();
  });

  it('should create a ng-package.json with ngPackage conf', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const fileContent = getJsonFileContent(tree, '/projects/foo/ng-package.json');
    expect(fileContent.lib).toBeDefined();
    expect(fileContent.lib.entryFile).toEqual('src/my-index.ts');
    expect(fileContent.dest).toEqual('../../dist/foo');
  });

  it('should use default value for baseDir and entryFile', async () => {
    const tree = await schematicRunner.runSchematic(
      'library',
      {
        name: 'foobar',
      },
      workspaceTree,
    );

    expect(tree.files).toContain('/projects/foobar/src/public-api.ts');
  });

  it(`should add library to workspace`, async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = getJsonFileContent(tree, '/angular.json');
    expect(workspace.projects.foo).toBeDefined();
  });

  it('should set the prefix to lib if none is set', async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('lib');
  });

  it('should set the prefix correctly', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = await schematicRunner.runSchematic('library', options, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
  });

  it('should handle a pascalCasedName', async () => {
    const options = { ...defaultOptions, name: 'pascalCasedName' };
    const tree = await schematicRunner.runSchematic('library', options, workspaceTree);

    const config = getJsonFileContent(tree, '/angular.json');
    const project = config.projects.pascalCasedName;
    expect(project).toBeDefined();
    expect(project.root).toEqual('projects/pascal-cased-name');
    const svcContent = tree.readContent(
      '/projects/pascal-cased-name/src/lib/pascal-cased-name.service.ts',
    );
    expect(svcContent).toMatch(/providedIn: 'root'/);
  });

  describe(`update package.json`, () => {
    it(`should add ng-packagr to devDependencies`, async () => {
      const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toEqual(latestVersions['ng-packagr']);
    });

    it('should use the latest known versions in package.json', async () => {
      const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const pkg = JSON.parse(tree.readContent('/package.json'));
      expect(pkg.devDependencies['@angular/compiler-cli']).toEqual(latestVersions.Angular);
      expect(pkg.devDependencies['typescript']).toEqual(latestVersions['typescript']);
    });

    it(`should not override existing users dependencies`, async () => {
      const oldPackageJson = workspaceTree.readContent('package.json');
      workspaceTree.overwrite(
        'package.json',
        oldPackageJson.replace(
          `"typescript": "${latestVersions['typescript']}"`,
          `"typescript": "~2.5.2"`,
        ),
      );

      const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        {
          name: 'foo',
          skipPackageJson: true,
        },
        workspaceTree,
      );

      const packageJson = getJsonFileContent(tree, 'package.json');
      expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });
  });

  describe(`update tsconfig.json`, () => {
    it(`should add paths mapping to empty tsconfig`, async () => {
      const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths['foo']).toEqual(['./dist/foo']);
    });

    it(`should append to existing paths mappings`, async () => {
      workspaceTree.overwrite(
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              'unrelated': ['./something/else.ts'],
              'foo': ['libs/*'],
            },
          },
        }),
      );
      const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths['foo']).toEqual(['libs/*', './dist/foo']);
    });

    it(`should not modify the file when --skipTsConfig`, async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        {
          name: 'foo',
          skipTsConfig: true,
        },
        workspaceTree,
      );

      const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
    });
  });

  it('should generate inside of a library', async () => {
    let tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const componentOptions: ComponentOptions = {
      name: 'comp',
      project: 'foo',
    };
    tree = await schematicRunner.runSchematic('component', componentOptions, tree);
    expect(tree.exists('/projects/foo/src/lib/comp/comp.component.ts')).toBe(true);
  });

  it(`should support creating scoped libraries`, async () => {
    const scopedName = '@myscope/mylib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = await schematicRunner.runSchematic('library', options, workspaceTree);

    const pkgJsonPath = '/projects/myscope/mylib/package.json';
    expect(tree.files).toContain(pkgJsonPath);
    expect(tree.files).toContain('/projects/myscope/mylib/src/lib/mylib.service.ts');
    expect(tree.files).toContain('/projects/myscope/mylib/src/lib/mylib.component.ts');

    const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
    expect(pkgJson.name).toEqual(scopedName);

    const tsConfigJson = getJsonFileContent(tree, '/projects/myscope/mylib/tsconfig.spec.json');
    expect(tsConfigJson.extends).toEqual('../../../tsconfig.json');

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myscope/mylib']).toBeDefined();

    const rootTsCfg = getJsonFileContent(tree, '/tsconfig.json');
    expect(rootTsCfg.compilerOptions.paths['@myscope/mylib']).toEqual(['./dist/myscope/mylib']);
  });

  it(`should dasherize scoped libraries`, async () => {
    const scopedName = '@myScope/myLib';
    const expectedScopeName = '@my-scope/my-lib';
    const expectedFolderName = 'my-scope/my-lib';
    const options = { ...defaultOptions, name: scopedName };
    const tree = await schematicRunner.runSchematic('library', options, workspaceTree);

    const pkgJsonPath = '/projects/my-scope/my-lib/package.json';
    expect(tree.readContent(pkgJsonPath)).toContain(expectedScopeName);

    const ngPkgJsonPath = '/projects/my-scope/my-lib/ng-package.json';
    expect(tree.readContent(ngPkgJsonPath)).toContain(expectedFolderName);

    const pkgJson = JSON.parse(tree.readContent(pkgJsonPath));
    expect(pkgJson.name).toEqual(expectedScopeName);

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myScope/myLib']).toBeDefined();
  });

  it(`should create correct paths when 'newProjectRoot' is blank`, async () => {
    const workspaceTree = await schematicRunner.runSchematic('workspace', {
      ...workspaceOptions,
      newProjectRoot: '',
    });

    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const config = getJsonFileContent(tree, '/angular.json');
    const project = config.projects.foo;
    expect(project.root).toEqual('foo');
    const { options, configurations } = project.architect.build;
    expect(options.project).toEqual('foo/ng-package.json');
    expect(configurations.production.tsConfig).toEqual('foo/tsconfig.lib.prod.json');

    const libTsConfig = getJsonFileContent(tree, '/foo/tsconfig.lib.json');
    expect(libTsConfig.extends).toEqual('../tsconfig.json');
    const specTsConfig = getJsonFileContent(tree, '/foo/tsconfig.spec.json');
    expect(specTsConfig.extends).toEqual('../tsconfig.json');
  });

  it(`should add 'development' configuration`, async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.architect.build.configurations.development).toBeDefined();
  });

  it(`should add 'ng-packagr' builder`, async () => {
    const tree = await schematicRunner.runSchematic('library', defaultOptions, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.architect.build.builder).toBe(
      '@angular-devkit/build-angular:ng-packagr',
    );
  });

  describe('standalone=false', () => {
    const defaultNonStandaloneOptions = { ...defaultOptions, standalone: false };

    it('should export the component in the NgModule', async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        defaultNonStandaloneOptions,
        workspaceTree,
      );

      const fileContent = getFileContent(tree, '/projects/foo/src/lib/foo.module.ts');
      expect(fileContent).toMatch(/exports: \[\n(\s*) {2}FooComponent\n\1\]/);
    });

    it('should create files', async () => {
      const tree = await schematicRunner.runSchematic(
        'library',
        defaultNonStandaloneOptions,
        workspaceTree,
      );

      const files = tree.files;
      expect(files).toEqual(
        jasmine.arrayContaining([
          '/projects/foo/ng-package.json',
          '/projects/foo/package.json',
          '/projects/foo/README.md',
          '/projects/foo/tsconfig.lib.json',
          '/projects/foo/tsconfig.lib.prod.json',
          '/projects/foo/src/my-index.ts',
          '/projects/foo/src/lib/foo.module.ts',
          '/projects/foo/src/lib/foo.component.spec.ts',
          '/projects/foo/src/lib/foo.component.ts',
          '/projects/foo/src/lib/foo.service.spec.ts',
          '/projects/foo/src/lib/foo.service.ts',
        ]),
      );
    });
  });
});
