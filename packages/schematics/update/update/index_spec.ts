/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { HostTree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { map } from 'rxjs/operators';


describe('@schematics/update', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/update', __dirname + '/../collection.json',
  );
  let host: virtualFs.test.TestHost;
  let appTree: UnitTestTree = new UnitTestTree(new VirtualTree());

  beforeEach(() => {
    host = new virtualFs.test.TestHost({
      '/package.json': `{
        "name": "blah",
        "dependencies": {
          "@angular-devkit-tests/update-base": "1.0.0"
        }
      }`,
    });
    appTree = new UnitTestTree(new HostTree(host));
  });

  it('updates package.json', done => {
    // Since we cannot run tasks in unit tests, we need to validate that the default
    // update schematic updates the package.json appropriately, AND validate that the
    // migrate schematic actually do work appropriately, in a separate test.
    schematicRunner.runSchematicAsync('update', { all: true }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular-devkit-tests/update-base']).toBe('1.1.0');

        // Check install task.
        expect(schematicRunner.tasks).toEqual([
          {
            name: 'node-package',
            options: jasmine.objectContaining({
              command: 'install',
            }),
          },
        ]);
      }),
    ).subscribe(undefined, done.fail, done);
  });

  it('calls migration tasks', done => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.0.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', { all: true }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular-devkit-tests/update-base']).toBe('1.1.0');
        expect(packageJson['dependencies']['@angular-devkit-tests/update-migrations'])
          .toBe('1.6.0');

        // Check install task.
        expect(schematicRunner.tasks).toEqual([
          {
            name: 'node-package',
            options: jasmine.objectContaining({
              command: 'install',
            }),
          },
          {
            name: 'run-schematic',
            options: jasmine.objectContaining({
              name: 'migrate',
            }),
          },
        ]);
      }),
    ).subscribe(undefined, done.fail, done);
  });

  it('can migrate only', done => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.0.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', {
      packages: ['@angular-devkit-tests/update-migrations'],
      migrateOnly: true,
    }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular-devkit-tests/update-base']).toBe('1.0.0');
        expect(packageJson['dependencies']['@angular-devkit-tests/update-migrations'])
          .toBe('1.0.0');

        // Check install task.
        expect(schematicRunner.tasks).toEqual([
          {
            name: 'run-schematic',
            options: jasmine.objectContaining({
              name: 'migrate',
            }),
          },
        ]);
      }),
    ).subscribe(undefined, done.fail, done);
  });

  it('can migrate from only', done => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.6.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', {
      packages: ['@angular-devkit-tests/update-migrations'],
      migrateOnly: true,
      from: '0.1.2',
    }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular-devkit-tests/update-migrations'])
          .toBe('1.6.0');

        // Check install task.
        expect(schematicRunner.tasks).toEqual([
          {
            name: 'run-schematic',
            options: jasmine.objectContaining({
              name: 'migrate',
            }),
          },
        ]);
      }),
    ).subscribe(undefined, done.fail, done);
  });
});
