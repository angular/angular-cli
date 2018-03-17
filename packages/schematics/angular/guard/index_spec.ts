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
import { Schema as GuardOptions } from './schema';


describe('Guard Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: GuardOptions = {
    name: 'foo',
    spec: true,
    module: undefined,
    flat: true,
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
    viewEncapsulation: 'Emulated',
    routing: false,
    style: 'css',
    skipTests: false,
  };
  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a guard', () => {
    const tree = schematicRunner.runSchematic('guard', defaultOptions, appTree);
    const files = tree.files;
    expect(files.indexOf('/projects/bar/src/app/foo.guard.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/bar/src/app/foo.guard.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const appModule = tree.readContent('/projects/bar/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooGuard } from '.\/foo.guard'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/projects/bar/src/app/app.moduleXXX.ts' };
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
    expect(files.indexOf('/projects/bar/src/app/foo.guard.spec.ts')).toEqual(-1);
    expect(files.indexOf('/projects/bar/src/app/foo.guard.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should provide with the module flag', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(/import.*FooGuard.*from '.\/foo.guard';/);
    expect(content).toMatch(/providers:\s*\[FooGuard\]/m);
  });

  it('should not provide without the module flag', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('guard', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).not.toMatch(/import.*FooGuard.*from '.\/foo.guard';/);
    expect(content).not.toMatch(/providers:\s*\[FooGuard\]/m);
  });


});
