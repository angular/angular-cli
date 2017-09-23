/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import * as path from 'path';
import { createAppModule, getFileContent } from '../utility/test';
import { Schema as DirectiveSchema } from './schema';


describe('Directive Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: DirectiveSchema = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    export: false,
    prefix: 'app',
    flat: true,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a directive', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.directive.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.directive.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo.directive'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooDirective\r?\n/m);
  });

  it('should create respect the flat flag', () => {
    const options = { ...defaultOptions, flat: false };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.directive.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.directive.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should find the closest module', () => {
    const options = { ...defaultOptions, flat: false };
    const fooModule = '/src/app/foo/foo.module.ts';
    appTree.create(fooModule, `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
        declarations: []
      })
      export class FooModule { }
    `);

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const fooModuleContent = getFileContent(tree, fooModule);
    expect(fooModuleContent).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should export the directive', () => {
    const options = { ...defaultOptions, export: true };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const appModuleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooDirective\]/);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('directive', options, appTree);
    const appModule = getFileContent(tree, '/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
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
    const content = getFileContent(tree, '/src/app/my-dir.directive.ts');
    expect(content).toMatch(/selector: '\[appMyDir\]'/);
  });
});
