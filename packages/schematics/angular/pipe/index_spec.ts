/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { createAppModule, getFileContent } from '../utility/test';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as PipeOptions } from './schema';


describe('Pipe Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: PipeOptions = {
    name: 'foo',
    spec: true,
    module: undefined,
    export: false,
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

  it('should create a pipe', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.pipe.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.pipe.ts');
    const moduleContent = getFileContent(tree, '/projects/bar/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo.pipe'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooPipe\r?\n/m);
    const fileContent = tree.readContent('/projects/bar/src/app/foo.pipe.ts');
    expect(fileContent).toContain('transform(value: any, ...args: any[])');
  });

  it('should import into a specified module', async () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();
    const appModule = getFileContent(tree, '/projects/bar/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooPipe } from '.\/foo.pipe'/);
  });

  it('should fail if specified module does not exist', async () => {
    const options = { ...defaultOptions, module: '/projects/bar/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should handle a path in the name and module options', async () => {
    appTree = await schematicRunner.runSchematicAsync(
      'module',
      { name: 'admin/module', project: 'bar' },
      appTree,
    ).toPromise();

    const options = { ...defaultOptions, module: 'admin/module' };
    appTree = await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();

    const content = appTree.readContent('/projects/bar/src/app/admin/module/module.module.ts');
    expect(content).toMatch(/import { FooPipe } from '\.\.\/\.\.\/foo.pipe'/);
  });

  it('should export the pipe', async () => {
    const options = { ...defaultOptions, export: true };

    const tree = await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();
    const appModuleContent = getFileContent(tree, '/projects/bar/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooPipe\]/);
  });

  it('should respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematicAsync('pipe', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.pipe.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.pipe.ts');
    const moduleContent = getFileContent(tree, '/projects/bar/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.pipe'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooPipe\r?\n/m);
  });

  it('should use the module flag even if the module is a routing module', async () => {
    const routingFileName = 'app-routing.module.ts';
    const routingModulePath = `/projects/bar/src/app/${routingFileName}`;
    const newTree = createAppModule(appTree, routingModulePath);
    const options = { ...defaultOptions, module: routingFileName };
    const tree = await schematicRunner.runSchematicAsync('pipe', options, newTree).toPromise();
    const content = getFileContent(tree, routingModulePath);
    expect(content).toMatch(/import { FooPipe } from '.\/foo.pipe/);
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

    // should fail without a module in that dir
    await expectAsync(
      schematicRunner.runSchematicAsync('pipe', defaultOptions, appTree).toPromise(),
    ).toBeRejected();

    // move the module
    appTree.rename('/projects/bar/src/app/app.module.ts', '/projects/bar/custom/app/app.module.ts');
    appTree = await schematicRunner.runSchematicAsync('pipe', defaultOptions, appTree).toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.pipe.ts');
  });
});
