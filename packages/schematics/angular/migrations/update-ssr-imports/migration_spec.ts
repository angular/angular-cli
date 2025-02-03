/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { tags } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('CommonEngine migration', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      'package.json',
      JSON.stringify({
        dependencies: {
          '@angular/ssr': '0.0.0',
        },
      }),
    );
  });

  function runMigration(): Promise<UnitTestTree> {
    return schematicRunner.runSchematic('update-ssr-imports', {}, tree);
  }

  it(`should replace 'CommonEngine*' imports from '@angular/ssr' to '@angular/ssr/node'`, async () => {
    tree.create(
      '/index.ts',
      tags.stripIndents`
      import { CommonEngine } from '@angular/ssr';
      import type { CommonEngineOptions, CommonEngineRenderOptions } from '@angular/ssr';
    `,
    );

    const newTree = await runMigration();
    expect(newTree.readContent('/index.ts')).toBe(tags.stripIndents`
      import { CommonEngine } from '@angular/ssr/node';
      import type { CommonEngineOptions, CommonEngineRenderOptions } from '@angular/ssr/node';
    `);
  });

  it(`should not replace 'CommonEngine*' imports from '@angular/ssr/node'`, async () => {
    const input = tags.stripIndents`
    import { CommonEngine } from '@angular/ssr/node';
    import type { CommonEngineOptions, CommonEngineRenderOptions } from '@angular/ssr/node';
  `;

    tree.create('/index.ts', input);

    const newTree = await runMigration();
    expect(newTree.readContent('/index.ts')).toBe(input);
  });

  it(`should not replace 'CommonEngine*' imports from other package`, async () => {
    const input = tags.stripIndents`
    import { CommonEngine } from 'unknown';
    import type { CommonEngineOptions, CommonEngineRenderOptions } from 'unknown';
  `;

    tree.create('/index.ts', input);

    const newTree = await runMigration();
    expect(newTree.readContent('/index.ts')).toBe(input);
  });
});
