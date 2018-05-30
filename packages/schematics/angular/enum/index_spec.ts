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
import { Schema as EnumOptions } from './schema';


describe('Enum Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: EnumOptions = {
    name: 'foo',
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

  it('should create an enumeration', () => {
    const tree = schematicRunner.runSchematic('enum', defaultOptions, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo.enum.ts')).toBeGreaterThanOrEqual(0);
  });
  it('should create an enumeration', () => {
    const tree = schematicRunner.runSchematic('enum', defaultOptions, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo.enum.ts');
    expect(content).toMatch('export enum Foo {');
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = schematicRunner.runSchematic('enum', defaultOptions, appTree);
    expect(appTree.files.indexOf('/projects/bar/custom/app/foo.enum.ts')).toBeGreaterThanOrEqual(0);
  });
});
