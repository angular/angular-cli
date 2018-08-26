/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {SchematicTestRunner} from '@angular-devkit/schematics/testing';
import {Schema as UniversalOptions} from './schema';
import {collectionPath, createTestApp} from '../test-setup/test-app';
import {Tree} from '@angular-devkit/schematics';

describe('Universal Schematic', () => {
  const defaultOptions: UniversalOptions = {
    clientProject: 'bar',
  };

  let schematicRunner: SchematicTestRunner;
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTestApp();
    schematicRunner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should add dependency: @nguniversal/module-map-ngfactory-loader', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"@nguniversal\/module-map-ngfactory-loader\": \"/);
  });

  it('should add dependency: @nguniversal/express-engine', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"@nguniversal\/express-engine\": \"/);
  });

  it('should add dependency: express', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"express\": \"/);
  });

  it('should install npm dependencies', () => {
    schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    expect(schematicRunner.tasks.length).toBe(2);
    expect(schematicRunner.tasks[0].name).toBe('node-package');
    expect((schematicRunner.tasks[0].options as {command: string}).command).toBe('install');
  });

  it('should not add Universal files', () => {
    const noUniversal = Object.assign({}, defaultOptions);
    noUniversal.skipUniversal = true;

    const tree = schematicRunner.runSchematic('ng-add', noUniversal, appTree);
    const filePath = '/src/server.main.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch('');
  });
});
