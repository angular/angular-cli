/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { ProjectType } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig = {
    version: 1,
    projects: {
      app: {
        root: '/project/app',
        sourceRoot: '/project/app/src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              localize: true,
              polyfills: [],
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to update the workspace configuration`, () => {
  const schematicName = 'update-workspace-config';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should add '@angular/localize/init' to polyfills if localize is enabled`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    expect(app.architect.build.options.polyfills).toContain('@angular/localize/init');
  });

  it(`should not add '@angular/localize/init' to polyfills if it already exists`, async () => {
    // Add '@angular/localize/init' manually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = tree.readJson('/angular.json') as any;
    config.projects.app.architect.build.options.polyfills.push('@angular/localize/init');
    tree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    const polyfills = app.architect.build.options.polyfills;
    expect(polyfills.filter((p: string) => p === '@angular/localize/init').length).toBe(1);
  });

  it(`should not add polyfills if localize is not enabled`, async () => {
    // Disable 'localize'
    const config = JSON.parse(tree.readContent('/angular.json'));
    config.projects.app.architect.build.options.localize = false;
    tree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    expect(app.architect.build.options.polyfills).not.toContain('@angular/localize/init');
  });
});
