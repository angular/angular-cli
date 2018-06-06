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
import { Schema as InterfaceOptions } from './schema';


describe('Interface Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
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
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create one file', () => {
    const tree = schematicRunner.runSchematic('interface', defaultOptions, appTree);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create an interface named "Foo"', () => {
    const tree = schematicRunner.runSchematic('interface', defaultOptions, appTree);
    const fileContent = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(fileContent).toMatch(/export interface Foo/);
  });

  it('should put type in the file name', () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = schematicRunner.runSchematic('interface', options, appTree);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.model.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = schematicRunner.runSchematic('interface', defaultOptions, appTree);
    expect(appTree.files.indexOf('/projects/bar/custom/app/foo.ts'))
      .toBeGreaterThanOrEqual(0);
  });
});
