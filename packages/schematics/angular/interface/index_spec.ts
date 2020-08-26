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
import { Schema as InterfaceOptions } from './schema';


describe('Interface Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: InterfaceOptions = {
    name: 'foo',
    prefix: '',
    type: '',
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

  it('should create one file', async () => {
    const tree = await schematicRunner.runSchematicAsync('interface', defaultOptions, appTree)
      .toPromise();
    expect(tree.files).toContain('/projects/bar/src/app/foo.ts');
  });

  it('should create an interface named "Foo"', async () => {
    const tree = await schematicRunner.runSchematicAsync('interface', defaultOptions, appTree)
      .toPromise();
    const fileContent = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(fileContent).toMatch(/export interface Foo/);
  });

  it('should put type in the file name', async () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = await schematicRunner.runSchematicAsync('interface', options, appTree)
      .toPromise();
    expect(tree.files).toContain('/projects/bar/src/app/foo.model.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematicAsync('interface', defaultOptions, appTree)
      .toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.ts');
  });
});
