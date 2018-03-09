/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { createAppModule } from '../utility/test';
import { Schema as ServiceOptions } from './schema';


describe('Service Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ServiceOptions = {
    name: 'foo',
    path: 'src/app',
    spec: true,
    module: undefined,
    flat: false,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a service', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('service', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.service.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.service.ts')).toBeGreaterThanOrEqual(0);
  });

  it('service should be tree-shakeable', () => {
    const options = { ...defaultOptions};

    const tree = schematicRunner.runSchematic('service', options, appTree);
    const content = tree.readContent('/src/app/foo/foo.service.ts');
    expect(content).toMatch(/providedIn: 'root',/);
  });

  it('should import a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('service', options, appTree);
    const content = tree.readContent('/src/app/foo/foo.service.ts');
    expect(content).toMatch(/import { AppModule } from '..\/app.module'/);
    expect(content).toMatch(/providedIn: AppModule,/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('service', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should respect the spec flag', () => {
    const options = { ...defaultOptions, spec: false };

    const tree = schematicRunner.runSchematic('service', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.service.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.service.spec.ts')).toEqual(-1);
  });
});
