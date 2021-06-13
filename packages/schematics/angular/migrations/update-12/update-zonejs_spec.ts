/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getPackageJsonDependency } from '../../utility/dependencies';

const schematicName = 'update-zonejs';
describe(`Migration to update 'zone.js' to 0.11.x. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify({ 'dependencies': { 'zone.js': '~0.10.0' } }, undefined, 2),
    );
  });

  it(`should update 'zone.js' dependency in 'package.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(getPackageJsonDependency(newTree, 'zone.js')?.version).toBe('~0.11.4');
  });

  it(`should update 'zone.js/dist/zone' import`, async () => {
    tree.create(
      'file.ts',
      `
      import 'zone.js';
      import 'zone.js/dist/zone';
      import "zone.js/dist/zone";
      // import "zone.js/dist/zone";
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      import 'zone.js';
      import 'zone.js';
      import "zone.js";
      // import "zone.js";
    `);
  });

  it(`should update 'zone.js/dist/zone' require`, async () => {
    tree.create(
      'file.ts',
      `
      require('zone.js');
      require('zone.js/dist/zone');
      require("zone.js/dist/zone");
      // require("zone.js/dist/zone");
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      require('zone.js');
      require('zone.js');
      require("zone.js");
      // require("zone.js");
    `);
  });

  it(`should update 'zone.js/dist/zone-error' import`, async () => {
    tree.create(
      'file.ts',
      `
      import 'zone.js/plugins/zone-error';
      import 'zone.js/dist/zone-error';
      import "zone.js/dist/zone-error";
      // import "zone.js/dist/zone-error";
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      import 'zone.js/plugins/zone-error';
      import 'zone.js/plugins/zone-error';
      import "zone.js/plugins/zone-error";
      // import "zone.js/plugins/zone-error";
    `);
  });

  it(`should update 'zone.js/dist/zone-error' require`, async () => {
    tree.create(
      'file.ts',
      `
      require('zone.js/plugins/zone-error');
      require('zone.js/dist/zone-error');
      require("zone.js/dist/zone-error");
      // require("zone.js/dist/zone-error");
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      require('zone.js/plugins/zone-error');
      require('zone.js/plugins/zone-error');
      require("zone.js/plugins/zone-error");
      // require("zone.js/plugins/zone-error");
    `);
  });

  it(`should update 'zone.js/dist/zone-testing' import`, async () => {
    tree.create(
      'file.ts',
      `
      import 'zone.js/testing';
      import 'zone.js/dist/zone-testing';
      import "zone.js/dist/zone-testing";
      // import "zone.js/dist/zone-testing";
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      import 'zone.js/testing';
      import 'zone.js/testing';
      import "zone.js/testing";
      // import "zone.js/testing";
    `);
  });

  it(`should update 'zone.js/dist/zone-testing' require`, async () => {
    tree.create(
      'file.ts',
      `
      require('zone.js/testing');
      require('zone.js/dist/zone-testing');
      require("zone.js/dist/zone-testing");
      // require("zone.js/dist/zone-testing");
    `,
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('file.ts')).toBe(`
      require('zone.js/testing');
      require('zone.js/testing');
      require("zone.js/testing");
      // require("zone.js/testing");
    `);
  });
});
