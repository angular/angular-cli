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
import { Schema as ComponentSchema } from './schema';


describe('Component Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ComponentSchema = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'None',
    changeDetection: 'Default',
    routing: false,
    styleext: 'css',
    spec: true,
    module: undefined,
    export: false,
    prefix: undefined,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a component', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.component'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooComponent\r?\n/m);
  });

  it('should set change detection to OnPush', () => {
    const options = { ...defaultOptions, changeDetection: 'OnPush' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
  });

  it('should set view encapsulation to Emulated', () => {
    const options = { ...defaultOptions, viewEncapsulation: 'Emulated' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.Emulated/);
  });

  it('should create a flat component', () => {
    const options = { ...defaultOptions, flat: true };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.component.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should find the closest module', () => {
    const options = { ...defaultOptions };
    const fooModule = '/src/app/foo/foo.module.ts';
    appTree.create(fooModule, `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
        declarations: []
      })
      export class FooModule { }
    `);

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const fooModuleContent = getFileContent(tree, fooModule);
    expect(fooModuleContent).toMatch(/import { FooComponent } from '.\/foo.component'/);
  });

  it('should export the component', () => {
    const options = { ...defaultOptions, export: true };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const appModuleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooComponent\]/);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const appModule = getFileContent(tree, '/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooComponent } from '.\/foo\/foo.component'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('component', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should handle upper case paths', () => {
    const pathOption = 'app/SOME/UPPER/DIR';
    const options = { ...defaultOptions, path: pathOption };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    let files = tree.files;
    let root = `/src/${pathOption}/foo/foo.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);

    const options2 = { ...options, name: 'BAR' };
    const tree2 = schematicRunner.runSchematic('component', options2, tree);
    files = tree2.files;
    root = `/src/${pathOption}/bar/bar.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);
  });

  it('should create a component in a sub-directory', () => {
    const options = { ...defaultOptions, path: 'app/a/b/c' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    const root = `/src/${options.path}/foo/foo.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);
  });

  it('should handle ".." in a path', () => {
    const options = { ...defaultOptions, path: 'app/a/../c' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    const root = `/src/app/c/foo/foo.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);
  });

  it('should use the prefix', () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'pre-foo'/);
  });

  it('should not use a prefix if none is passed', () => {
    const options = { ...defaultOptions, prefix: '' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'foo'/);
  });

  it('should respect the inlineTemplate option', () => {
    const options = { ...defaultOptions, inlineTemplate: true };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(content).toMatch(/template: /);
    expect(content).not.toMatch(/templateUrl: /);
    expect(tree.files.indexOf('/src/app/foo/foo.component.html')).toEqual(-1);
  });

  it('should respect the inlineStyle option', () => {
    const options = { ...defaultOptions, inlineStyle: true };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styles: \[/);
    expect(content).not.toMatch(/styleUrls: /);
    expect(tree.files.indexOf('/src/app/foo/foo.component.css')).toEqual(-1);
  });

  it('should respect the styleext option', () => {
    const options = { ...defaultOptions, styleext: 'scss' };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = getFileContent(tree, '/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styleUrls: \['.\/foo.component.scss/);
    expect(tree.files.indexOf('/src/app/foo/foo.component.scss')).toBeGreaterThanOrEqual(0);
    expect(tree.files.indexOf('/src/app/foo/foo.component.css')).toEqual(-1);
  });
});
