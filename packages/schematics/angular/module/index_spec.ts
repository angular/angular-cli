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
import { Schema as ModuleOptions } from './schema';

// tslint:disable:max-line-length
describe('Module Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ModuleOptions = {
    name: 'foo',
    module: undefined,
    flat: false,
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
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should create a module', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.module.ts');
  });

  it('should import into another module', async () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(/import { FooModule } from '.\/foo\/foo.module'/);
    expect(content).toMatch(/imports: \[[^\]]*FooModule[^\]]*\]/m);
  });

  it('should import into another module when using flat', async () => {
    const options = { ...defaultOptions, flat: true, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(/import { FooModule } from '.\/foo.module'/);
    expect(content).toMatch(/imports: \[[^\]]*FooModule[^\]]*\]/m);
  });

  it('should import into another module (deep)', async () => {
    let tree = appTree;

    tree = await schematicRunner.runSchematicAsync('module', {
      ...defaultOptions,
      path: 'projects/bar/src/app/sub1',
      name: 'test1',
    }, tree).toPromise();
    tree = await schematicRunner.runSchematicAsync('module', {
      ...defaultOptions,
      path: 'projects/bar/src/app/sub2',
      name: 'test2',
      module: '../sub1/test1',
    }, tree).toPromise();

    const content = tree.readContent('/projects/bar/src/app/sub1/test1/test1.module.ts');
    expect(content).toMatch(/import { Test2Module } from '..\/..\/sub2\/test2\/test2.module'/);
  });

  it('should create a routing module', async () => {
    const options = { ...defaultOptions, routing: true };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.module.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo-routing.module.ts');
    const moduleContent = tree.readContent('/projects/bar/src/app/foo/foo.module.ts');
    expect(moduleContent).toMatch(/import { FooRoutingModule } from '.\/foo-routing.module'/);
    const routingModuleContent = tree.readContent('/projects/bar/src/app/foo/foo-routing.module.ts');
    expect(routingModuleContent).toMatch(/RouterModule.forChild\(routes\)/);
  });

  it('should dasherize a name', async () => {
    const options = { ...defaultOptions, name: 'TwoWord' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/two-word/two-word.module.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematicAsync('module', defaultOptions, appTree)
      .toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo/foo.module.ts');
  });
});
