/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkspace(tree: UnitTestTree): void {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: 'src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          test: {
            builder: Builders.Karma,
            options: {
              main: 'test.ts',
              karmaConfig: './karma.config.js',
              tsConfig: 'test-spec.json',
            },
            configurations: {
              production: {
                main: 'test-multiple-context.ts',
              },
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
  tree.create(
    'test.ts',
    tags.stripIndents`
  import { getTestBed } from '@angular/core/testing';
  import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
  } from '@angular/platform-browser-dynamic/testing';

  declare const require: {
    context(path: string, deep?: boolean, filter?: RegExp): {
      <T>(id: string): T;
      keys(): string[];
    };
  };

  // First, initialize the Angular testing environment.
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );

  // Then we find all the tests.
  const context = require.context('./', true, /\.spec\.ts$/);
  // And load the modules.
  context.keys().map(context);
  `,
  );

  tree.create(
    'test-multiple-context.ts',
    tags.stripIndents`
  import { getTestBed } from '@angular/core/testing';
  import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
  } from '@angular/platform-browser-dynamic/testing';

  declare const require: {
    context(path: string, deep?: boolean, filter?: RegExp): {
      <T>(id: string): T;
      keys(): string[];
    };
  };

  // First, initialize the Angular testing environment.
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );

  // Then we find all the tests.
  const context1 = require.context('./', true, /\.spec\.ts$/);
  const context2 = require.context('./', true, /\.spec\.ts$/);
  // And load the modules.
  context2.keys().forEach(context2);
  context1.keys().map(context1);
  `,
  );
}

describe(`Migration to karma builder main file (test.ts)`, () => {
  const schematicName = 'update-karma-main-file';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkspace(tree);
  });

  it(`should remove 'declare const require' and 'require.context' usages`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readText('test.ts')).toBe(tags.stripIndents`
      import { getTestBed } from '@angular/core/testing';
      import {
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting
      } from '@angular/platform-browser-dynamic/testing';

      // First, initialize the Angular testing environment.
      getTestBed().initTestEnvironment(
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting(),
      );
    `);
  });

  it(`should remove multiple 'require.context' usages`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readText('test-multiple-context.ts')).toBe(tags.stripIndents`
      import { getTestBed } from '@angular/core/testing';
      import {
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting
      } from '@angular/platform-browser-dynamic/testing';

      // First, initialize the Angular testing environment.
      getTestBed().initTestEnvironment(
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting(),
      );
    `);
  });
});
