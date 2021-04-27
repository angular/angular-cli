/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { BuilderTarget, Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function getBuildTarget(tree: UnitTestTree): BuilderTarget<Builders.Browser, JsonObject> {
  return JSON.parse(tree.readContent('/angular.json')).projects.app.architect.build;
}

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: 'src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.Browser,
            options: {
              scripts: [
                { lazy: true, name: 'bundle-1.js' },
              ],
              extractCss: false,
              sourceMaps: true,
              buildOptimizer: false,
              // tslint:disable-next-line:no-any
            } as any,
            configurations: {
              one: {
                aot: true,
                scripts: [
                  { lazy: true, name: 'bundle-1.js' },
                  { lazy: false, name: 'bundle-2.js' },
                  { inject: true, name: 'bundle-3.js' },
                  'bundle-4.js',
                ],
                styles: [
                  { lazy: true, name: 'bundle-1.css' },
                  { lazy: false, name: 'bundle-2.css' },
                  { inject: true, name: 'bundle-3.css' },
                  'bundle-3.css',
                ],
              },
              two: {
                extractCss: true,
                aot: true,
              },
              // tslint:disable-next-line:no-any
            } as any,
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

const schematicName = 'update-angular-config-v11';

describe(`Migration to update 'angular.json'. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should remove 'extractCss'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.extractCss).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.extractCss).toBeUndefined();
    expect(configurations?.two.extractCss).toBeUndefined();
  });

  it(`should replace 'lazy' with 'inject'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(configurations?.one.scripts).toEqual([
      { inject: false, name: 'bundle-1.js' },
      { inject: true, name: 'bundle-2.js' },
      { inject: true, name: 'bundle-3.js' },
      'bundle-4.js',
    ]);

    expect(configurations?.one.styles).toEqual([
      { inject: false, name: 'bundle-1.css' },
      { inject: true, name: 'bundle-2.css' },
      { inject: true, name: 'bundle-3.css' },
      'bundle-3.css',
    ]);

    expect(options.scripts).toEqual([
      { inject: false, name: 'bundle-1.js' },
    ]);
  });
});
