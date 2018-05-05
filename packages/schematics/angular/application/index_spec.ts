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
    expect(files.indexOf('/projects/foo/tslint.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/environments/environment.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/environments/environment.prod.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/favicon.ico')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/index.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/polyfills.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/styles.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/test.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app/app.component.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should add the application to the workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo).toBeDefined();
    expect(workspace.defaultProject).toBe('foo');
  });

  it('should set the prefix to app if none is set', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('app');
  });

  it('should set the prefix correctly', () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = schematicRunner.runSchematic('application', options, workspaceTree);
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
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
    const specTsConfig = JSON.parse(content);
    expect(specTsConfig.files).toEqual(['src/test.ts', 'src/polyfills.ts']);
  });

  it('should set the right path and prefix in the tslint file', () => {
    const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.extends).toMatch('../../tslint.json');
    expect(content.rules['directive-selector'][2]).toMatch('app');
    expect(content.rules['component-selector'][2]).toMatch('app');
  });

  describe(`update package.json`, () => {
    it(`should add build-angular to devDependencies`, () => {
      const tree = schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-angular'])
        .toEqual(latestVersions.DevkitBuildAngular);
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
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });
  });

  describe('custom projectRoot', () => {
    it('should put app files in the right spot', () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = schematicRunner.runSchematic('application', options, workspaceTree);
      const files = tree.files;
      expect(files.indexOf('/src/karma.conf.js')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/tsconfig.app.json')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/tsconfig.spec.json')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/tslint.json')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/environments/environment.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/environments/environment.prod.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/favicon.ico')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/index.html')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/main.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/polyfills.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/styles.css')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/test.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/app/app.component.css')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/app/app.component.html')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/app/app.component.spec.ts')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/src/app/app.component.ts')).toBeGreaterThanOrEqual(0);
    });

    it('should set values in angular.json correctly', () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = schematicRunner.runSchematic('application', options, workspaceTree);
      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      expect(prj.root).toEqual('');
      const buildOpt = prj.architect.build.options;
      expect(buildOpt.index).toEqual('src/index.html');
      expect(buildOpt.main).toEqual('src/main.ts');
      expect(buildOpt.polyfills).toEqual('src/polyfills.ts');
      expect(buildOpt.tsConfig).toEqual('src/tsconfig.app.json');

      const testOpt = prj.architect.test.options;
      expect(testOpt.main).toEqual('src/test.ts');
      expect(testOpt.tsConfig).toEqual('src/tsconfig.spec.json');
      expect(testOpt.karmaConfig).toEqual('src/karma.conf.js');
      expect(testOpt.styles).toEqual([
        'src/styles.css',
      ]);
    });

    it('should set the relative tsconfig paths', () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = schematicRunner.runSchematic('application', options, workspaceTree);
      const appTsConfig = JSON.parse(tree.readContent('/src/tsconfig.app.json'));
      expect(appTsConfig.extends).toEqual('../tsconfig.json');
      const specTsConfig = JSON.parse(tree.readContent('/src/tsconfig.spec.json'));
      expect(specTsConfig.extends).toEqual('../tsconfig.json');
      expect(specTsConfig.files).toEqual(['test.ts', 'polyfills.ts']);
    });

    it('should set the relative path and prefix in the tslint file', () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = schematicRunner.runSchematic('application', options, workspaceTree);
      const content = JSON.parse(tree.readContent('/src/tslint.json'));
      expect(content.extends).toMatch('../tslint.json');
      expect(content.rules['directive-selector'][2]).toMatch('app');
      expect(content.rules['component-selector'][2]).toMatch('app');
    });
  });
});
