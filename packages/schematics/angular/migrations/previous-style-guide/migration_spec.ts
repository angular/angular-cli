/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree, initialSchematicsValue?: unknown) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '/project/lib',
        sourceRoot: '/project/app/src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {},
      },
    },
  };

  if (initialSchematicsValue !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (angularConfig as any).schematics = initialSchematicsValue;
  }

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to update 'angular.json'.`, () => {
  const schematicName = 'previous-style-guide';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should add defaults if no "schematics" workspace field is present`, async () => {
    createWorkSpaceConfig(tree);

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { schematics } = JSON.parse(newTree.readContent('/angular.json'));

    expect(schematics).toEqual({
      '@schematics/angular:component': { type: 'component' },
      '@schematics/angular:directive': { type: 'directive' },
      '@schematics/angular:service': { type: 'service' },
      '@schematics/angular:guard': { typeSeparator: '.' },
      '@schematics/angular:interceptor': { typeSeparator: '.' },
      '@schematics/angular:module': { typeSeparator: '.' },
      '@schematics/angular:pipe': { typeSeparator: '.' },
      '@schematics/angular:resolver': { typeSeparator: '.' },
    });
  });

  it(`should add defaults if empty "schematics" workspace field is present`, async () => {
    createWorkSpaceConfig(tree, {});

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { schematics } = JSON.parse(newTree.readContent('/angular.json'));

    expect(schematics).toEqual({
      '@schematics/angular:component': { type: 'component' },
      '@schematics/angular:directive': { type: 'directive' },
      '@schematics/angular:service': { type: 'service' },
      '@schematics/angular:guard': { typeSeparator: '.' },
      '@schematics/angular:interceptor': { typeSeparator: '.' },
      '@schematics/angular:module': { typeSeparator: '.' },
      '@schematics/angular:pipe': { typeSeparator: '.' },
      '@schematics/angular:resolver': { typeSeparator: '.' },
    });
  });

  it(`should add defaults if invalid "schematics" workspace field is present`, async () => {
    createWorkSpaceConfig(tree, 10);

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { schematics } = JSON.parse(newTree.readContent('/angular.json'));

    expect(schematics).toEqual({
      '@schematics/angular:component': { type: 'component' },
      '@schematics/angular:directive': { type: 'directive' },
      '@schematics/angular:service': { type: 'service' },
      '@schematics/angular:guard': { typeSeparator: '.' },
      '@schematics/angular:interceptor': { typeSeparator: '.' },
      '@schematics/angular:module': { typeSeparator: '.' },
      '@schematics/angular:pipe': { typeSeparator: '.' },
      '@schematics/angular:resolver': { typeSeparator: '.' },
    });
  });

  it(`should add defaults if existing unrelated "schematics" workspace defaults are present`, async () => {
    createWorkSpaceConfig(tree, {
      '@schematics/angular:component': { style: 'scss' },
    });

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { schematics } = JSON.parse(newTree.readContent('/angular.json'));

    expect(schematics).toEqual({
      '@schematics/angular:component': { style: 'scss', type: 'component' },
      '@schematics/angular:directive': { type: 'directive' },
      '@schematics/angular:service': { type: 'service' },
      '@schematics/angular:guard': { typeSeparator: '.' },
      '@schematics/angular:interceptor': { typeSeparator: '.' },
      '@schematics/angular:module': { typeSeparator: '.' },
      '@schematics/angular:pipe': { typeSeparator: '.' },
      '@schematics/angular:resolver': { typeSeparator: '.' },
    });
  });

  it(`should not overwrite defaults if existing "schematics" workspace defaults are present`, async () => {
    createWorkSpaceConfig(tree, {
      '@schematics/angular:component': { type: 'example' },
      '@schematics/angular:guard': { typeSeparator: '-' },
    });

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { schematics } = JSON.parse(newTree.readContent('/angular.json'));

    expect(schematics).toEqual({
      '@schematics/angular:component': { type: 'example' },
      '@schematics/angular:directive': { type: 'directive' },
      '@schematics/angular:service': { type: 'service' },
      '@schematics/angular:guard': { typeSeparator: '-' },
      '@schematics/angular:interceptor': { typeSeparator: '.' },
      '@schematics/angular:module': { typeSeparator: '.' },
      '@schematics/angular:pipe': { typeSeparator: '.' },
      '@schematics/angular:resolver': { typeSeparator: '.' },
    });
  });
});
