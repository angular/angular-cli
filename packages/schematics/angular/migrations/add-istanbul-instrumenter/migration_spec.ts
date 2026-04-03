/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to add istanbul-lib-instrument', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify({
        devDependencies: {},
      }),
    );
  });

  function createWorkspace(builder: string, options?: any, configurations?: any) {
    tree.create(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          app: {
            root: '',
            targets: {
              test: {
                builder,
                options,
                configurations,
              },
            },
          },
        },
      }),
    );
  }

  async function expectDependency(defined: boolean) {
    const newTree = await schematicRunner.runSchematic('add-istanbul-instrumenter', {}, tree);
    const { devDependencies } = newTree.readJson('/package.json') as any;
    if (defined) {
      expect(devDependencies['istanbul-lib-instrument']).toBeDefined();
    } else {
      expect(devDependencies['istanbul-lib-instrument']).toBeUndefined();
    }
  }

  it('should add istanbul-lib-instrument for @angular-devkit/build-angular:karma', async () => {
    createWorkspace('@angular-devkit/build-angular:karma');

    await expectDependency(true);
  });

  it('should add istanbul-lib-instrument for @angular/build:karma', async () => {
    createWorkspace('@angular/build:karma');

    await expectDependency(true);
  });

  it('should add istanbul-lib-instrument for @angular/build:unit-test with runner: karma', async () => {
    createWorkspace('@angular/build:unit-test', { runner: 'karma' });

    await expectDependency(true);
  });

  it('should add istanbul-lib-instrument if runner: karma is in configuration', async () => {
    createWorkspace('@angular/build:unit-test', undefined, { ci: { runner: 'karma' } });

    await expectDependency(true);
  });

  it('should NOT add istanbul-lib-instrument for @angular/build:unit-test with runner: vitest', async () => {
    createWorkspace('@angular/build:unit-test', { runner: 'vitest' });

    await expectDependency(false);
  });

  it('should NOT add istanbul-lib-instrument for @angular/build:unit-test with no runner specified (default vitest)', async () => {
    createWorkspace('@angular/build:unit-test', {});

    await expectDependency(false);
  });

  it('should NOT add istanbul-lib-instrument if no karma builder is used', async () => {
    createWorkspace('@angular-devkit/build-angular:browser');

    await expectDependency(false);
  });
});
