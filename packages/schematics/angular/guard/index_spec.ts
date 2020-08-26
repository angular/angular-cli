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
import { Schema as GuardOptions } from './schema';

describe('Guard Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: GuardOptions = {
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
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should create a guard', async () => {
    const tree = await schematicRunner.runSchematicAsync('guard', defaultOptions, appTree)
      .toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.guard.ts');
  });

  it('should respect the skipTests flag', async () => {
    const options = { ...defaultOptions, skipTests: true };

    const tree = await schematicRunner.runSchematicAsync('guard', options, appTree)
      .toPromise();
    const files = tree.files;
    expect(files).not.toContain('/projects/bar/src/app/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.guard.ts');
  });

  it('should respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematicAsync('guard', options, appTree)
      .toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.guard.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematicAsync('guard', defaultOptions, appTree)
      .toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.guard.ts');
  });

  it('should respect the implements value', async () => {
    const options = { ...defaultOptions, implements: ['CanActivate']};
    const tree = await schematicRunner.runSchematicAsync('guard', options, appTree)
      .toPromise();
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    expect(fileString).toContain('CanActivate');
    expect(fileString).toContain('canActivate');
    expect(fileString).not.toContain('CanActivateChild');
    expect(fileString).not.toContain('canActivateChild');
    expect(fileString).not.toContain('CanLoad');
    expect(fileString).not.toContain('canLoad');
  });

  it('should respect the implements values', async () => {
    const implementationOptions = ['CanActivate', 'CanLoad', 'CanActivateChild'];
    const options = { ...defaultOptions, implements: implementationOptions};
    const tree = await schematicRunner.runSchematicAsync('guard', options, appTree)
      .toPromise();
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');

    // Should contain all implementations
    implementationOptions.forEach((implementation: string) => {
      expect(fileString).toContain(implementation);
      const functionName = `${implementation.charAt(0).toLowerCase()}${implementation.slice(1)}`;
      expect(fileString).toContain(functionName);
    });
  });

  it('should use CanActivate if no implements value', async () => {
    const options = { ...defaultOptions, implements: undefined };
    const tree = await schematicRunner.runSchematicAsync('guard', options, appTree)
      .toPromise();
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    expect(fileString).toContain('CanActivate');
    expect(fileString).toContain('canActivate');
    expect(fileString).not.toContain('CanActivateChild');
    expect(fileString).not.toContain('canActivateChild');
    expect(fileString).not.toContain('CanLoad');
    expect(fileString).not.toContain('canLoad');
  });
});
