/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ApplicationOptions } from './schema';

// tslint:disable:max-line-length
describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const defaultOptions: ApplicationOptions = {
    name: 'foo',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'Emulated',
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  let workspaceTree: UnitTestTree;
  beforeEach(() => {
    workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create all files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/projects/foo/karma.conf.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/tsconfig.app.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/tsconfig.spec.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/environments/environment.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/environments/environment.prod.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/favicon.ico')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/index.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/polyfills.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/styles.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/test.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.component.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should add the application to the workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo).toBeDefined();
  });

  it('should handle the routing flag', () => {
    const options = { ...defaultOptions, routing: true };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/projects/foo/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app-routing.module.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = tree.readContent('/projects/foo/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import { AppRoutingModule } from '.\/app-routing.module'/);
    const routingModuleContent = tree.readContent('/projects/foo/src/app/app-routing.module.ts');
    expect(routingModuleContent).toMatch(/RouterModule.forRoot\(routes\)/);
  });

  it('should import BrowserModule in the app module', () => {
    const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
    const path = '/projects/foo/src/app/app.module.ts';
    const content = tree.readContent(path);
    expect(content).toMatch(/import { BrowserModule } from \'@angular\/platform-browser\';/);
  });

  it('should declare app component in the app module', () => {
    const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
    const path = '/projects/foo/src/app/app.module.ts';
    const content = tree.readContent(path);
    expect(content).toMatch(/import { AppComponent } from \'\.\/app\.component\';/);
  });

  it('should set the right paths in the tsconfig files', () => {
    const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
    let path = '/projects/foo/tsconfig.app.json';
    let content = tree.readContent(path);
    expect(content).toMatch('../../tsconfig.json');
    path = '/projects/foo/tsconfig.spec.json';
    content = tree.readContent(path);
    expect(content).toMatch('../../tsconfig.json');
  });

  describe(`update package.json`, () => {
    it(`should add build-webpack to devDependencies`, () => {
      const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-webpack'])
        .toEqual(latestVersions.DevkitBuildWebpack);
    });

    it('should use the latest known versions in package.json', () => {
      const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
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

      const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, () => {
      const tree = schematicRunner.runSchematic('application', {
        name: 'foo',
        skipPackageJson: true,
      }, workspaceTree);

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-webpack']).toBeUndefined();
    });
  });
});
