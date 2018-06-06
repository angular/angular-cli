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
import { createAppModule } from '../utility/test';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ComponentOptions } from './schema';

// tslint:disable:max-line-length
describe('Component Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ComponentOptions = {
    name: 'foo',
    // path: 'src/app',
    inlineStyle: false,
    inlineTemplate: false,
    changeDetection: 'Default',
    styleext: 'css',
    spec: true,
    module: undefined,
    export: false,
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

  it('should create a component', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo/foo.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo/foo.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo/foo.component.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.component'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooComponent\r?\n/m);
  });

  it('should set change detection to OnPush', () => {
    const options = { ...defaultOptions, changeDetection: 'OnPush' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
  });

  it('should not set view encapsulation', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).not.toMatch(/encapsulation: ViewEncapsulation/);
  });

  it('should set view encapsulation to Emulated', () => {
    const options = { ...defaultOptions, viewEncapsulation: 'Emulated' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.Emulated/);
  });

  it('should set view encapsulation to None', () => {
    const options = { ...defaultOptions, viewEncapsulation: 'None' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.None/);
  });

  it('should create a flat component', () => {
    const options = { ...defaultOptions, flat: true };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo.component.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should find the closest module', () => {
    const options = { ...defaultOptions };
    const fooModule = '/projects/bar/src/app/foo/foo.module.ts';
    appTree.create(fooModule, `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
        declarations: []
      })
      export class FooModule { }
    `);

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const fooModuleContent = tree.readContent(fooModule);
    expect(fooModuleContent).toMatch(/import { FooComponent } from '.\/foo.component'/);
  });

  it('should export the component', () => {
    const options = { ...defaultOptions, export: true };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooComponent\]/);
  });

  it('should set the entry component', () => {
    const options = { ...defaultOptions, entryComponent: true };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/entryComponents: \[FooComponent\]/);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const appModule = tree.readContent('/projects/bar/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooComponent } from '.\/foo\/foo.component'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/projects/bar/src/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('component', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should handle upper case paths', () => {
    const pathOption = 'projects/bar/src/app/SOME/UPPER/DIR';
    const options = { ...defaultOptions, path: pathOption };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    let files = tree.files;
    let root = `/${pathOption}/foo/foo.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);

    const options2 = { ...options, name: 'BAR' };
    const tree2 = schematicRunner.runSchematic('component', options2, tree);
    files = tree2.files;
    root = `/${pathOption}/bar/bar.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);
  });

  it('should create a component in a sub-directory', () => {
    const options = { ...defaultOptions, path: 'projects/bar/src/app/a/b/c' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    const root = `/${options.path}/foo/foo.component`;
    expect(files.indexOf(`${root}.css`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.html`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.spec.ts`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${root}.ts`)).toBeGreaterThanOrEqual(0);
  });

  it('should use the prefix', () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'pre-foo'/);
  });

  it('should use the default project prefix if none is passed', () => {
    const options = { ...defaultOptions, prefix: undefined };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'app-foo'/);
  });

  it('should use the supplied prefix if it is ""', () => {
    const options = { ...defaultOptions, prefix: '' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'foo'/);
  });

  it('should respect the inlineTemplate option', () => {
    const options = { ...defaultOptions, inlineTemplate: true };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/template: /);
    expect(content).not.toMatch(/templateUrl: /);
    expect(tree.files.indexOf('/projects/bar/src/app/foo/foo.component.html')).toEqual(-1);
  });

  it('should respect the inlineStyle option', () => {
    const options = { ...defaultOptions, inlineStyle: true };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styles: \[/);
    expect(content).not.toMatch(/styleUrls: /);
    expect(tree.files.indexOf('/projects/bar/src/app/foo/foo.component.css')).toEqual(-1);
  });

  it('should respect the styleext option', () => {
    const options = { ...defaultOptions, styleext: 'scss' };
    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styleUrls: \['.\/foo.component.scss/);
    expect(tree.files.indexOf('/projects/bar/src/app/foo/foo.component.scss'))
      .toBeGreaterThanOrEqual(0);
    expect(tree.files.indexOf('/projects/bar/src/app/foo/foo.component.css')).toEqual(-1);
  });

  it('should use the module flag even if the module is a routing module', () => {
    const routingFileName = 'app-routing.module.ts';
    const routingModulePath = `/projects/bar/src/app/${routingFileName}`;
    const newTree = createAppModule(appTree, routingModulePath);
    const options = { ...defaultOptions, module: routingFileName };
    const tree = schematicRunner.runSchematic('component', options, newTree);
    const content = tree.readContent(routingModulePath);
    expect(content).toMatch(/import { FooComponent } from '.\/foo\/foo.component/);
  });

  it('should handle a path in the name option', () => {
    const options = { ...defaultOptions, name: 'dir/test-component' };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(
      // tslint:disable-next-line:max-line-length
      /import { TestComponentComponent } from '\.\/dir\/test-component\/test-component.component'/);
  });

  it('should handle a path in the name and module options', () => {
    appTree = schematicRunner.runSchematic('module', { name: 'admin/module', project: 'bar' }, appTree);

    const options = { ...defaultOptions, name: 'other/test-component', module: 'admin/module' };
    appTree = schematicRunner.runSchematic('component', options, appTree);

    const content = appTree.readContent('/projects/bar/src/app/admin/module/module.module.ts');
    expect(content).toMatch(
      // tslint:disable-next-line:max-line-length
      /import { TestComponentComponent } from '..\/..\/other\/test-component\/test-component.component'/);
  });

  it('should create the right selector with a path in the name', () => {
    const options = { ...defaultOptions, name: 'sub/test' };
    appTree = schematicRunner.runSchematic('component', options, appTree);
    const content = appTree.readContent('/projects/bar/src/app/sub/test/test.component.ts');
    expect(content).toMatch(/selector: 'app-test'/);
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

    // should fail without a module in that dir
    expect(() => schematicRunner.runSchematic('component', defaultOptions, appTree)).toThrow();

    // move the module
    appTree.rename('/projects/bar/src/app/app.module.ts', '/projects/bar/custom/app/app.module.ts');
    appTree = schematicRunner.runSchematic('component', defaultOptions, appTree);
    expect(appTree.files.indexOf('/projects/bar/custom/app/foo/foo.component.ts'))
      .toBeGreaterThanOrEqual(0);
  });
});
