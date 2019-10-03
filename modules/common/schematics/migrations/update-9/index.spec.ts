/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { version9UpdateRule } from './index';
import { createTestApp, collectionPath } from '../../testing/test-app';

describe('Migration to version 9', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    collectionPath,
  );

  let tree: UnitTestTree;
  beforeEach(async () => {
    tree =  await createTestApp();
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
    const scripts = pkg.scripts;
    scripts['compile:server'] = 'old compile:server';
    scripts['serve:ssr'] = 'old serve:ssr';
    scripts['build:client-and-server-bundles'] = 'old build:client-and-server-bundles';

    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2));
  });

  it(`should backup old 'server.ts' and 'webpack.server.config.js'`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();
    expect(newTree.exists('/projects/test-app/server.ts.bak')).toBeTruthy();
    expect(newTree.exists('/projects/test-app/webpack.server.config.js.bak')).toBeTruthy();
  });

  it(`should backup old 'package.json' scripts`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();

    const { scripts } = JSON.parse(newTree.read('/package.json')!.toString());
    expect(scripts['build:client-and-server-bundles']).toBeUndefined();
    expect(scripts['compile:server']).toBeUndefined();
    expect(scripts['serve:ssr']).toBeUndefined();

    expect(scripts['build:client-and-server-bundles_bak']).toBeDefined();
    expect(scripts['compile:server_bak']).toBeDefined();
    expect(scripts['serve:ssr_bak']).toBeDefined();
  });

  it(`should not backup old 'package.json' scripts when target is missing`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();

    const { scripts } = JSON.parse(newTree.read('/package.json')!.toString());
    expect(scripts['build:ssr']).toBeUndefined();
    expect(scripts['build:ssr_bak']).toBeUndefined();
  });
});
