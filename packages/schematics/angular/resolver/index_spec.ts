/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema } from './schema';

describe('resolver Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: Schema = {
    name: 'foo',
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
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a (deprecated) class-based resolver with --no-functional', async () => {
    const tree = await schematicRunner.runSchematic(
      'resolver',
      { ...defaultOptions, functional: false },
      appTree,
    );
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo-resolver.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo-resolver.ts');
    const fileString = tree.readContent('/projects/bar/src/app/foo-resolver.ts');
    expect(fileString).toContain('export class FooResolver implements Resolve<boolean>');
  });

  it('should respect the skipTests flag', async () => {
    const options = { ...defaultOptions, skipTests: true };

    const tree = await schematicRunner.runSchematic('resolver', options, appTree);
    const files = tree.files;
    expect(files).not.toContain('/projects/bar/src/app/foo-resolver.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo-resolver.ts');
  });

  it('should use a `.` type separator when specified', async () => {
    const options = { ...defaultOptions, typeSeparator: '.' };

    const tree = await schematicRunner.runSchematic('resolver', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.resolver.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.resolver.ts');
    const specContent = tree.readContent('/projects/bar/src/app/foo.resolver.spec.ts');
    expect(specContent).toContain(`'./foo.resolver'`);
  });

  it('should use a `-` type separator when specified', async () => {
    const options = { ...defaultOptions, typeSeparator: '-' };

    const tree = await schematicRunner.runSchematic('resolver', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo-resolver.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo-resolver.ts');
    const specContent = tree.readContent('/projects/bar/src/app/foo-resolver.spec.ts');
    expect(specContent).toContain(`'./foo-resolver'`);
  });

  it('should respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematic('resolver', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo-resolver.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo-resolver.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematic('resolver', defaultOptions, appTree);
    expect(appTree.files).toContain('/projects/bar/custom/app/foo-resolver.ts');
  });

  it('should create a functional resolver', async () => {
    const tree = await schematicRunner.runSchematic('resolver', defaultOptions, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo-resolver.ts');
    expect(fileString).toContain(
      'export const fooResolver: ResolveFn<boolean> = (route, state) => {',
    );
  });

  it('should create a helper function to run a functional resolver in a test', async () => {
    const tree = await schematicRunner.runSchematic('resolver', defaultOptions, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo-resolver.spec.ts');
    expect(fileString).toContain(
      'const executeResolver: ResolveFn<boolean> = (...resolverParameters) => ',
    );
    expect(fileString).toContain(
      'TestBed.runInInjectionContext(() => fooResolver(...resolverParameters));',
    );
  });
});
