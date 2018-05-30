/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as DirectiveOptions } from './schema';

// tslint:disable:max-line-length
describe('Directive Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: DirectiveOptions = {
    name: 'foo',
    spec: true,
    module: undefined,
    export: false,
    prefix: 'app',
    flat: true,
    project: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a directive', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo.directive.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo.directive.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo.directive'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooDirective\r?\n/m);
  });

  it('should create respect the flat flag', () => {
    const options = { ...defaultOptions, flat: false };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo/foo.directive.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo/foo.directive.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should find the closest module', () => {
    const options = { ...defaultOptions, flat: false };
    const fooModule = '/projects/bar/src/app/foo/foo.module.ts';
    appTree.create(fooModule, `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
        declarations: []
      })
      export class FooModule { }
    `);

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const fooModuleContent = tree.readContent(fooModule);
    expect(fooModuleContent).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should export the directive', () => {
    const options = { ...defaultOptions, export: true };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooDirective\]/);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const appModule = tree.readContent('/projects/bar/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/projects/bar/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('directive', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should converts dash-cased-name to a camelCasedSelector', () => {
    const options = { ...defaultOptions, name: 'my-dir' };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/my-dir.directive.ts');
    expect(content).toMatch(/selector: '\[appMyDir\]'/);
  });

  it('should create the right selector with a path in the name', () => {
    const options = { ...defaultOptions, name: 'sub/test' };
    appTree = schematicRunner.runSchematic('directive', options, appTree);

    const content = appTree.readContent('/projects/bar/src/app/sub/test.directive.ts');
    expect(content).toMatch(/selector: '\[appTest\]'/);
  });

  it('should use the prefix', () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[preFoo\]'/);
  });

  it('should use the default project prefix if none is passed', () => {
    const options = { ...defaultOptions, prefix: undefined };
    const tree = schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[appFoo\]'/);
  });

  it('should use the supplied prefix if it is ""', () => {
    const options = { ...defaultOptions, prefix: '' };
    const tree = schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[foo\]'/);
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

    // should fail without a module in that dir
    expect(() => schematicRunner.runSchematic('directive', defaultOptions, appTree)).toThrow();

    // move the module
    appTree.rename('/projects/bar/src/app/app.module.ts', '/projects/bar/custom/app/app.module.ts');
    appTree = schematicRunner.runSchematic('directive', defaultOptions, appTree);
    expect(appTree.files.indexOf('/projects/bar/custom/app/foo.directive.ts'))
      .toBeGreaterThanOrEqual(0);
  });
});
