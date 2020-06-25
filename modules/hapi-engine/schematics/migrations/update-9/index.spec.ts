/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonParseMode, parseJson } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { createTestApp } from '../../testing/test-app';

describe('Migration to version 9', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(async () => {
    tree = await createTestApp();
    tree = await schematicRunner
      .runExternalSchematicAsync(
        '@schematics/angular',
        'universal',
        {
          clientProject: 'test-app',
        },
        tree,
      )
      .toPromise();

    // create old stucture
    tree.create('/projects/test-app/server.ts', 'server content');
    tree.create('/projects/test-app/webpack.server.config.js', 'webpack config content');

    const pkg = JSON.parse(tree.readContent('/package.json'));
    pkg.devDependencies['@nguniversal/hapi-engine'] = '0.0.0';
    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2));
  });

  it(`should backup old 'server.ts' and 'webpack.server.config.js'`, async () => {
    const newTree =
      await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

    expect(newTree.exists('/projects/test-app/server.ts.bak')).toBeTruthy();
    expect(newTree.exists('/projects/test-app/webpack.server.config.js.bak')).toBeTruthy();
  });

  it(`should create new 'server.ts'`, async () => {
    const newTree =
      await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

    expect(newTree.exists('/projects/test-app/server.ts')).toBeTruthy();
    const serverContent = newTree.readContent('/projects/test-app/server.ts');
    expect(serverContent).toContain('function run()');
    expect(serverContent).toContain(`export * from './src/main.server'`);
  });

  it(`should add 'server.ts' to 'tsconfig.server.json' files`, async () => {
    const newTree =
      await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

    const { files } = parseJson(
      newTree.readContent('/projects/test-app/tsconfig.server.json'),
      JsonParseMode.Loose,
    ) as any;

    expect(files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });

  it(`should update 'package.json' scripts`, async () => {
    const newTree =
      await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

    const { scripts } = JSON.parse(newTree.readContent('/package.json'));
    expect(scripts['build:ssr'])
      .toBe('ng build --prod && ng run test-app:server:production');
    expect(scripts['serve:ssr']).toBe('node dist/test-app/server/main.js');
  });

  describe('mono-repo', () => {
    beforeEach(async () => {
      tree = await schematicRunner
        .runExternalSchematicAsync(
          '@schematics/angular',
          'application',
          {
            name: 'test-app-two',
            version: '1.2.3',
            directory: '.',
            style: 'css',
          },
          tree,
        )
        .toPromise();
      tree = await schematicRunner
        .runExternalSchematicAsync(
          '@schematics/angular',
          'universal',
          {
            clientProject: 'test-app-two',
          },
          tree,
        )
        .toPromise();

      // create old stucture
      tree.create('/projects/test-app-two/server.ts', 'server content');
      tree.create('/projects/test-app-two/webpack.server.config.js', 'webpack content');
    });

    it(`should backup old 'server.ts' and 'webpack.server.config.js'`, async () => {
      const newTree =
        await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

      expect(newTree.exists('/projects/test-app-two/server.ts.bak')).toBeTruthy();
      expect(newTree.exists('/projects/test-app-two/webpack.server.config.js.bak'))
        .toBeTruthy();
    });

    it(`should create new 'server.ts'`, async () => {
      const newTree =
        await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

      expect(newTree.exists('/projects/test-app-two/server.ts')).toBeTruthy();
      const serverContent = newTree.readContent('/projects/test-app-two/server.ts');
      expect(serverContent).toContain('function run()');
      expect(serverContent).toContain(`export * from './src/main.server'`);
    });

    it(`should add 'server.ts' to 'tsconfig.server.json' files`, async () => {
      const newTree =
        await schematicRunner.runSchematicAsync('update-9', {}, tree.branch()).toPromise();

      const { files } = parseJson(
        newTree.readContent('/projects/test-app-two/tsconfig.server.json'),
        JsonParseMode.Loose,
      ) as any;

      expect(files).toEqual([
        'src/main.server.ts',
        'server.ts',
      ]);
    });
  });
});
