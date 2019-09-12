/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Tree} from '@angular-devkit/schematics';
import {SchematicTestRunner} from '@angular-devkit/schematics/testing';

import {collectionPath, createTestApp} from '../testing/test-app';

import {Schema as UniversalOptions} from './schema';

describe('Universal Schematic', () => {
  const defaultOptions: UniversalOptions = {
    clientProject: 'bar',
  };

  let schematicRunner: SchematicTestRunner;
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestApp().toPromise();
    schematicRunner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should add dependency: @nguniversal/hapi-engine', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"@nguniversal\/hapi-engine\": \"/);
  });

  it('should add dependency: hapi', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"hapi\": \"/);
  });

  it('should install npm dependencies', async () => {
    await schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree)
        .toPromise();
    expect(schematicRunner.tasks.length).toBe(2);
    expect(schematicRunner.tasks[0].name).toBe('node-package');
    expect((schematicRunner.tasks[0].options as {command: string}).command)
        .toBe('install');
  });

  it(`should update 'tsconfig.server.json' files with Express main file`, async () => {
    const tree = await schematicRunner
      .runSchematicAsync('ng-add', defaultOptions, appTree)
      .toPromise();

    const contents = JSON.parse(tree.readContent('/projects/bar/tsconfig.server.json'));
    expect(contents.files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });

  it(`should add export to main file in 'server.ts'`, async () => {
    const tree = await schematicRunner
      .runSchematicAsync('ng-add', defaultOptions, appTree)
      .toPromise();

    const content = tree.readContent('/projects/bar/server.ts');
    expect(content).toContain(`export * from './src/main.server'`);
  });
});
