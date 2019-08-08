/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as DirectiveOptions } from './schema';

describe('Directive Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: DirectiveOptions = {
    name: 'foo',
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
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should create a directive', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.directive.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.directive.ts');
    const moduleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo.directive'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooDirective\r?\n/m);
  });

  it('should create respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.directive.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.directive.ts');
  });

  it('should find the closest module', async () => {
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

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const fooModuleContent = tree.readContent(fooModule);
    expect(fooModuleContent).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should export the directive', async () => {
    const options = { ...defaultOptions, export: true };

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooDirective\]/);
  });

  it('should import into a specified module', async () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const appModule = tree.readContent('/projects/bar/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooDirective } from '.\/foo.directive'/);
  });

  it('should fail if specified module does not exist', async () => {
    const options = { ...defaultOptions, module: '/projects/bar/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      await schematicRunner.runSchematicAsync('directive', options, appTree).toPromise();
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should converts dash-cased-name to a camelCasedSelector', async () => {
    const options = { ...defaultOptions, name: 'my-dir' };

    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();
    const content = tree.readContent('/projects/bar/src/app/my-dir.directive.ts');
    expect(content).toMatch(/selector: '\[appMyDir\]'/);
  });

  it('should create the right selector with a path in the name', async () => {
    const options = { ...defaultOptions, name: 'sub/test' };
    appTree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();

    const content = appTree.readContent('/projects/bar/src/app/sub/test.directive.ts');
    expect(content).toMatch(/selector: '\[appTest\]'/);
  });

  it('should use the prefix', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[preFoo\]'/);
  });

  it('should use the default project prefix if none is passed', async () => {
    const options = { ...defaultOptions, prefix: undefined };
    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[appFoo\]'/);
  });

  it('should use the supplied prefix if it is ""', async () => {
    const options = { ...defaultOptions, prefix: '' };
    const tree = await schematicRunner.runSchematicAsync('directive', options, appTree)
      .toPromise();

    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    expect(content).toMatch(/selector: '\[foo\]'/);
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

    // should fail without a module in that dir
    await expectAsync(
      schematicRunner.runSchematicAsync('directive', defaultOptions, appTree).toPromise(),
    ).toBeRejected();

    // move the module
    appTree.rename('/projects/bar/src/app/app.module.ts', '/projects/bar/custom/app/app.module.ts');
    appTree = await schematicRunner.runSchematicAsync('directive', defaultOptions, appTree)
      .toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.directive.ts');
  });
});
