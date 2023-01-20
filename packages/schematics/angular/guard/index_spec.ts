/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a (deprecated) class-based guard with --no-functional', async () => {
    const tree = await schematicRunner.runSchematic(
      'guard',
      { ...defaultOptions, functional: false },
      appTree,
    );

    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.guard.ts');
  });

  it('should respect the skipTests flag', async () => {
    const options = { ...defaultOptions, skipTests: true };

    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const files = tree.files;
    expect(files).not.toContain('/projects/bar/src/app/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.guard.ts');
  });

  it('should respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.guard.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.guard.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematic('guard', defaultOptions, appTree);
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.guard.ts');
  });

  it('should respect the implements value', async () => {
    const options = { ...defaultOptions, implements: ['CanActivate'], functional: false };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    expect(fileString).toContain('CanActivate');
    expect(fileString).toContain('canActivate');
    expect(fileString).not.toContain('CanActivateChild');
    expect(fileString).not.toContain('canActivateChild');
    expect(fileString).not.toContain('CanMatch');
    expect(fileString).not.toContain('canMatch');
  });

  it('should generate a functional guard by default', async () => {
    const options = { ...defaultOptions, implements: ['CanActivate'] };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    expect(fileString).toContain('export const fooGuard: CanActivateFn = (route, state) => {');
    expect(fileString).not.toContain('CanActivateChild');
    expect(fileString).not.toContain('canActivateChild');
    expect(fileString).not.toContain('CanMatch');
    expect(fileString).not.toContain('canMatch');
  });

  it('should generate a helper function to execute the guard in a test', async () => {
    const options = { ...defaultOptions, implements: ['CanActivate'] };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.spec.ts');
    expect(fileString).toContain('const executeGuard: CanActivateFn = (...guardParameters) => ');
    expect(fileString).toContain(
      'TestBed.runInInjectionContext(() => fooGuard(...guardParameters));',
    );
  });

  it('should generate CanDeactivateFn with unknown functional guard', async () => {
    const options = { ...defaultOptions, implements: ['CanDeactivate'] };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    expect(fileString).toContain(
      'export const fooGuard: CanDeactivateFn<unknown> = ' +
        '(component, currentRoute, currentState, nextState) => {',
    );
  });

  it('should respect the implements values in (deprecated) class-based guards', async () => {
    const implementationOptions = ['CanActivate', 'CanDeactivate', 'CanActivateChild'];
    const options = { ...defaultOptions, implements: implementationOptions, functional: false };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');

    // Should contain all implementations
    implementationOptions.forEach((implementation: string) => {
      expect(fileString).toContain(implementation);
      const functionName = `${implementation.charAt(0).toLowerCase()}${implementation.slice(1)}`;
      expect(fileString).toContain(functionName);
    });
  });

  it('should add correct imports based on CanMatch implementation in (deprecated) class-based guards', async () => {
    const implementationOptions = ['CanMatch'];
    const options = { ...defaultOptions, implements: implementationOptions, functional: false };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    const expectedImports = `import { CanMatch, Route, UrlSegment, UrlTree } from '@angular/router';`;

    expect(fileString).toContain(expectedImports);
  });

  it('should add correct imports based on CanActivate implementation in (deprecated) class-based guards', async () => {
    const implementationOptions = ['CanActivate'];
    const options = { ...defaultOptions, implements: implementationOptions, functional: false };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    const expectedImports = `import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';`;

    expect(fileString).toContain(expectedImports);
  });

  it('should add correct imports based on canActivate functional guard', async () => {
    const options = { ...defaultOptions, implements: ['CanActivate'] };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    const expectedImports = `import { CanActivateFn } from '@angular/router';`;

    expect(fileString).toContain(expectedImports);
  });

  it('should add correct imports if multiple implementations was selected in (deprecated) class-based guards', async () => {
    const implementationOptions = ['CanActivate', 'CanMatch', 'CanActivateChild'];
    const options = { ...defaultOptions, implements: implementationOptions, functional: false };
    const tree = await schematicRunner.runSchematic('guard', options, appTree);
    const fileString = tree.readContent('/projects/bar/src/app/foo.guard.ts');
    const expectedImports =
      `import ` +
      `{ ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanMatch, Route, RouterStateSnapshot, UrlSegment, UrlTree } ` +
      `from '@angular/router';`;

    expect(fileString).toContain(expectedImports);
  });
});
