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
import { Schema as ClassOptions } from './schema';


describe('Class Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ClassOptions = {
    name: 'foo',
    type: '',
    spec: false,
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

  it('should create just the class file', () => {
    const tree = schematicRunner.runSchematic('class', defaultOptions, appTree);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.ts')).toBeGreaterThanOrEqual(0);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.spec.ts')).toBeLessThan(0);
  });

  it('should create the class and spec file', () => {
    const options = {
      ...defaultOptions,
      spec: true,
    };
    const tree = schematicRunner.runSchematic('class', options, appTree);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.ts')).toBeGreaterThanOrEqual(0);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.spec.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create an class named "Foo"', () => {
    const tree = schematicRunner.runSchematic('class', defaultOptions, appTree);
    const fileContent = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(fileContent).toMatch(/export class Foo/);
  });

  it('should put type in the file name', () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = schematicRunner.runSchematic('class', options, appTree);
    expect(tree.files.indexOf('/projects/bar/src/app/foo.model.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should split the name to name & type with split on "."', () => {
    const options = {...defaultOptions, name: 'foo.model' };
    const tree = schematicRunner.runSchematic('class', options, appTree);
    const classPath = '/projects/bar/src/app/foo.model.ts';
    const content = tree.readContent(classPath);
    expect(content).toMatch(/export class Foo/);
  });

  it('should respect the path option', () => {
    const options = { ...defaultOptions, path: 'zzz' };
    const tree = schematicRunner.runSchematic('class', options, appTree);
    expect(tree.files.indexOf('/zzz/foo.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = schematicRunner.runSchematic('class', defaultOptions, appTree);
    expect(appTree.files.indexOf('/projects/bar/custom/app/foo.ts')).toBeGreaterThanOrEqual(0);
  });
});
