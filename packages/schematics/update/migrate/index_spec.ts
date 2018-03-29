/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { virtualFs } from '@angular-devkit/core';
import { HostTree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { map } from 'rxjs/operators';


describe('@schematics/update:migrate', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/update', __dirname + '/../collection.json',
  );
  let host: virtualFs.test.TestHost;
  let appTree: UnitTestTree = new UnitTestTree(new VirtualTree());

  beforeEach(() => {
    host = new virtualFs.test.TestHost({});
    appTree = new UnitTestTree(new HostTree(host));
  });

  it('sorts and understand RC', done => {
    // Since we cannot run tasks in unit tests, we need to validate that the default
    // update schematic updates the package.json appropriately, AND validate that the
    // migrate schematic actually do work appropriately, in a separate test.
    schematicRunner.runSchematicAsync('migrate', {
      package: 'test',
      collection: __dirname + '/test/migration.json',
      from: '1.0.0',
      to: '2.0.0',
    }, appTree).pipe(
      map(tree => {
        const resultJson = JSON.parse(tree.readContent('/migrations'));

        expect(resultJson).toEqual([
          'migration-03', // "1.0.5"
          'migration-05', // "1.1.0-beta.0"
          'migration-04', // "1.1.0-beta.1"
          'migration-02', // "1.1.0"
          'migration-13', // "1.1.0"
          'migration-19', // "1.1"
          'migration-06', // "1.4.0"
          'migration-17', // "2.0.0-alpha"
          'migration-16', // "2.0.0-alpha.5"
          'migration-08', // "2.0.0-beta.0"
          'migration-07', // "2.0.0-rc.0"
          'migration-12', // "2.0.0-rc.4"
          'migration-14', // "2.0.0"
          'migration-20', // "2"
        ]);
      }),
    ).subscribe(undefined, done.fail, done);
  });
});
