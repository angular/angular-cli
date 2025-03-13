/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { join } from 'node:path';

describe('@angular/ssr ng-add schematic', () => {
  const defaultOptions = {
    project: 'test-app',
  };

  const schematicRunner = new SchematicTestRunner(
    '@angular/ssr',
    require.resolve(join(__dirname, '../collection.json')),
  );

  let appTree: UnitTestTree;

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions,
    );
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'application',
      {
        name: 'test-app',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        style: 'css',
        skipTests: false,
        standalone: true,
      },
      appTree,
    );
  });

  it('works', async () => {
    const filePath = '/projects/test-app/src/server.ts';

    expect(appTree.exists(filePath)).toBeFalse();
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    expect(tree.exists(filePath)).toBeTrue();
  });
});
