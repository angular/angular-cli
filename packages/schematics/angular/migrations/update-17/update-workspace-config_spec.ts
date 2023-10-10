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
          'app-shell': {
            builder: Builders.AppShell,
            options: {
              browserTarget: 'app:build',
              serverTarget: 'app:server',
              route: '',
            },
            configurations: {
              production: {
                browserTarget: 'app:build:production',
                serverTarget: 'app:server:production',
              },
            },
          },
          serve: {
            builder: Builders.DevServer,
            options: {
              browserTarget: 'app:build:development',
            },
            configurations: {
              production: {
                browserTarget: 'app:build:production',
              },
            },
          },
          i18n: {
            builder: Builders.ExtractI18n,
            options: {
              browserTarget: 'app:build:production',
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to update 'angular.json'.`, () => {
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

  it(`should replace 'browserTarget' when using '@angular-devkit/build-angular:dev-server'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { browserTarget, buildTarget } = app.architect['serve'].options;
    expect(browserTarget).toBeUndefined();
    expect(buildTarget).toBe('app:build:development');

    const { browserTarget: browserTargetProd, buildTarget: buildTargetProd } =
      app.architect['serve'].configurations['production'];
    expect(browserTargetProd).toBeUndefined();
    expect(buildTargetProd).toBe('app:build:production');
  });

  it(`should replace 'browserTarget' when using '@angular-devkit/build-angular:extract-i18n'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { browserTarget, buildTarget } = app.architect['i18n'].options;
    expect(browserTarget).toBeUndefined();
    expect(buildTarget).toBe('app:build:production');
  });

  it(`should not replace 'browserTarget' when using other builders`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { browserTarget, buildTarget } = app.architect['app-shell'].options;
    expect(browserTarget).toBe('app:build');
    expect(buildTarget).toBeUndefined();
  });
});
