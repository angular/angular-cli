/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import * as path from 'path';
import { createAppModule, getFileContent } from '../utility/test';
import { Schema as GuardSchema } from './schema';


describe('Guard Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: GuardSchema = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    flat: true,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a guard', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.guard.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.guard.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const appModule = getFileContent(tree, '/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooGuard } from '.\/foo.guard'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('guard', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should respect the spec flag', () => {
    const options = { ...defaultOptions, spec: false };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.guard.spec.ts')).toEqual(-1);
    expect(files.indexOf('/src/app/foo.guard.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should provide with the module flag', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const content = getFileContent(tree, '/src/app/app.module.ts');
    expect(content).toMatch(/import.*FooGuard.*from '.\/foo.guard';/);
    expect(content).toMatch(/providers:\s*\[FooGuard\]/m);
  });

  it('should not provide without the module flag', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const content = getFileContent(tree, '/src/app/app.module.ts');
    expect(content).not.toMatch(/import.*FooGuard.*from '.\/foo.guard';/);
    expect(content).not.toMatch(/providers:\s*\[FooGuard\]/m);
  });


});
