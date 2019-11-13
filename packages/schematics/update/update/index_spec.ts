/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function

import { normalize, virtualFs } from '@angular-devkit/core';
import { HostTree, SchematicsException } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as semver from 'semver';
import { angularMajorCompatGuarantee } from './index';


describe('angularMajorCompatGuarantee', () => {
  [
    '5.0.0',
    '5.1.0',
    '5.20.0',
    '6.0.0',
    '6.0.0-rc.0',
    '6.0.0-beta.0',
    '6.1.0-beta.0',
    '6.1.0-rc.0',
    '6.10.11',
  ].forEach(golden => {
    it('works with ' + JSON.stringify(golden), () => {
      expect(semver.satisfies(golden, angularMajorCompatGuarantee('^5.0.0'))).toBeTruthy();
    });
  });
});

describe('@schematics/update', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/update',
    require.resolve('../collection.json'),
  );
  let host: virtualFs.test.TestHost;
  let appTree: UnitTestTree = new UnitTestTree(new HostTree());

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
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('ignores dependencies not hosted on the NPM registry', done => {
    const tree = new UnitTestTree(new HostTree(new virtualFs.test.TestHost({
      '/package.json': `{
        "name": "blah",
        "dependencies": {
          "@angular-devkit-tests/update-base": "file:update-base-1.0.0.tgz"
        }
      }`,
    })));

    schematicRunner.runSchematicAsync('update', { all: true }, tree).pipe(
      map(t => {
        const packageJson = JSON.parse(t.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular-devkit-tests/update-base'])
            .toBe('file:update-base-1.0.0.tgz');
      }),
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('emits SchematicsException when given an invalid dependency', done => {
    const tree = new UnitTestTree(new HostTree(new virtualFs.test.TestHost({
      '/package.json': `{
        "name": "blah",
        "dependencies": {
          "//": "'abc://' is not a valid protocol for NPM.",
          "@angular-devkit-tests/update-base": "abc://foo.tgz"
        }
      }`,
    })));

    schematicRunner.runSchematicAsync('update', { all: true }, tree).pipe(
      catchError(err => {
        expect(err instanceof SchematicsException).toBe(true);

        return EMPTY;
      }),
    ).toPromise().then(done, done.fail);
  });

  it('respects existing tilde and caret ranges', done => {
    // Add ranges.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-base'] = '^1.0.0';
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '~1.0.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', { all: true }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        // This one should not change because 1.1.0 was already satisfied by ^1.0.0.
        expect(packageJson['dependencies']['@angular-devkit-tests/update-base']).toBe('^1.0.0');
        expect(packageJson['dependencies']['@angular-devkit-tests/update-migrations'])
          .toBe('~1.6.0');
      }),
    ).toPromise().then(done, done.fail);
  }, 45000);

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
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('updates Angular as compatible with Angular N-1', done => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    const dependencies = packageJson['dependencies'];
    dependencies['@angular-devkit-tests/update-peer-dependencies-angular-5'] = '1.0.0';
    dependencies['@angular/core'] = '5.1.0';
    dependencies['rxjs'] = '5.5.0';
    dependencies['zone.js'] = '0.8.26';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', {
      packages: ['@angular/core@^6.0.0'],
    }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular/core'][0]).toBe('6');

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
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('updates Angular as compatible with Angular N-1 (2)', done => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    const dependencies = packageJson['dependencies'];
    dependencies['@angular-devkit-tests/update-peer-dependencies-angular-5-2'] = '1.0.0';
    dependencies['@angular/core'] = '5.1.0';
    dependencies['@angular/animations'] = '5.1.0';
    dependencies['@angular/common'] = '5.1.0';
    dependencies['@angular/compiler'] = '5.1.0';
    dependencies['@angular/compiler-cli'] = '5.1.0';
    dependencies['@angular/platform-browser'] = '5.1.0';
    dependencies['rxjs'] = '5.5.0';
    dependencies['zone.js'] = '0.8.26';
    dependencies['typescript'] = '2.4.2';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    schematicRunner.runSchematicAsync('update', {
      packages: ['@angular/core@^6.0.0'],
    }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        expect(packageJson['dependencies']['@angular/core'][0]).toBe('6');
        expect(packageJson['dependencies']['rxjs'][0]).toBe('6');
        expect(packageJson['dependencies']['typescript'][0]).toBe('2');
        expect(packageJson['dependencies']['typescript'][2]).not.toBe('4');

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
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('uses packageGroup for versioning', async () => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    const dependencies = packageJson['dependencies'];
    dependencies['@angular-devkit-tests/update-package-group-1'] = '1.0.0';
    dependencies['@angular-devkit-tests/update-package-group-2'] = '1.0.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    await schematicRunner.runSchematicAsync('update', {
      packages: ['@angular-devkit-tests/update-package-group-1'],
    }, appTree).pipe(
      map(tree => {
        const packageJson = JSON.parse(tree.readContent('/package.json'));
        const deps = packageJson['dependencies'];
        expect(deps['@angular-devkit-tests/update-package-group-1']).toBe('1.2.0');
        expect(deps['@angular-devkit-tests/update-package-group-2']).toBe('2.0.0');

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
    ).toPromise();
  }, 45000);

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
    ).toPromise().then(done, done.fail);
  }, 45000);

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
              options: jasmine.objectContaining({
                from: '0.1.2',
                to: '1.6.0',
              }),
            }),
          },
        ]);
      }),
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('can install and migrate with --from (short version number)', done => {
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
      from: '0',
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
              options: jasmine.objectContaining({
                from: '0.0.0',
                to: '1.6.0',
              }),
            }),
          },
        ]);
      }),
    ).toPromise().then(done, done.fail);
  }, 45000);

  it('validates peer dependencies', done => {
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    const dependencies = packageJson['dependencies'];
    // TODO: when we start using a local npm registry for test packages, add a package that includes
    // a optional peer dependency and a non-optional one for this test. Use it instead of
    // @angular-devkit/build-angular, whose optional peerdep is @angular/localize and non-optional
    // are typescript and @angular/compiler-cli.
    dependencies['@angular-devkit/build-angular'] = '0.900.0-next.1';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    const messages: string[] = [];
    schematicRunner.logger.subscribe(x => messages.push(x.message));
    const hasPeerdepMsg = (dep: string) =>
      messages.some(str => str.includes(`missing peer dependency of "${dep}"`));

    schematicRunner.runSchematicAsync('update', {
      packages: ['@angular-devkit/build-angular'],
      next: true,
    }, appTree).pipe(
      map(() => {
        expect(hasPeerdepMsg('@angular/compiler-cli'))
          .toBeTruthy(`Should show @angular/compiler-cli message.`);
        expect(hasPeerdepMsg('typescript')).toBeTruthy(`Should show typescript message.`);
        expect(hasPeerdepMsg('@angular/localize'))
          .toBeFalsy(`Should not show @angular/localize message.`);
      }),
    ).toPromise().then(done, done.fail);
  }, 45000);
});
