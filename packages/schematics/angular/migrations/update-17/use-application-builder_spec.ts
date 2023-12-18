/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '/project/lib',
        sourceRoot: '/project/app/src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.Browser,
            options: {
              tsConfig: 'src/tsconfig.app.json',
              main: 'src/main.ts',
              polyfills: 'src/polyfills.ts',
              outputPath: 'dist/project',
              resourcesOutputPath: '/resources',
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
  tree.create('/tsconfig.json', JSON.stringify({}, undefined, 2));
  tree.create('/package.json', JSON.stringify({}, undefined, 2));
}

describe(`Migration to use the application builder`, () => {
  const schematicName = 'use-application-builder';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should replace 'outputPath' to string if 'resourcesOutputPath' is set to 'media'`, async () => {
    // Replace resourcesOutputPath
    tree.overwrite('angular.json', tree.readContent('angular.json').replace('/resources', 'media'));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath, resourcesOutputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
    });
    expect(resourcesOutputPath).toBeUndefined();
  });

  it(`should set 'outputPath.media' if 'resourcesOutputPath' is set and is not 'media'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath, resourcesOutputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
      media: 'resources',
    });
    expect(resourcesOutputPath).toBeUndefined();
  });

  it(`should remove 'browser' portion from 'outputPath'`, async () => {
    // Replace outputPath
    tree.overwrite(
      'angular.json',
      tree.readContent('angular.json').replace('dist/project/', 'dist/project/browser/'),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
      media: 'resources',
    });
  });
});
