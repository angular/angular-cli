/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
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
  ].forEach((golden) => {
    it('works with ' + JSON.stringify(golden), () => {
      expect(semver.satisfies(golden, angularMajorCompatGuarantee('^5.0.0'))).toBeTruthy();
    });
  });
});

describe('@schematics/update', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/update',
    require.resolve('./collection.json'),
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

  it('ignores dependencies not hosted on the NPM registry', async () => {
    let newTree = new UnitTestTree(
      new HostTree(
        new virtualFs.test.TestHost({
          '/package.json': `{
        "name": "blah",
        "dependencies": {
          "@angular-devkit-tests/update-base": "file:update-base-1.0.0.tgz"
        }
      }`,
        }),
      ),
    );

    newTree = await schematicRunner.runSchematic('update', undefined, newTree);
    const packageJson = JSON.parse(newTree.readContent('/package.json'));
    expect(packageJson['dependencies']['@angular-devkit-tests/update-base']).toBe(
      'file:update-base-1.0.0.tgz',
    );
  }, 45000);

  it('ignores dependencies hosted on alternative/private NPM registries', async () => {
    let newTree = new UnitTestTree(
      new HostTree(
        new virtualFs.test.TestHost({
          '/package.json': `{
        "name": "blah",
        "dependencies": {
          "@fortawesome/pro-thin-svg-icons": "^6.6.0",
          "@nostr/tools": "npm:@jsr/nostr__tools@^2.10.3"
        }
      }`,
          '/.npmrc': `@jsr:registry=https://npm.jsr.io`,
        }),
      ),
    );

    newTree = await schematicRunner.runSchematic('update', undefined, newTree);
    const packageJson = JSON.parse(newTree.readContent('/package.json'));
    expect(packageJson['dependencies']['@fortawesome/pro-thin-svg-icons']).toBe('^6.6.0');
    expect(packageJson['dependencies']['@nostr/tools']).toBe('npm:@jsr/nostr__tools@^2.10.3');
  }, 45000);

  it('should not error with yarn 2.0 protocols', async () => {
    let newTree = new UnitTestTree(
      new HostTree(
        new virtualFs.test.TestHost({
          '/package.json': `{
        "name": "blah",
        "dependencies": {
          "src": "src@link:./src",
          "@angular-devkit-tests/update-base": "1.0.0"
        }
      }`,
        }),
      ),
    );

    newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit-tests/update-base'],
      },
      newTree,
    );
    const { dependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(dependencies['@angular-devkit-tests/update-base']).toBe('1.1.0');
  });

  it('updates Angular as compatible with Angular N-1', async () => {
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

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular/core@^6.0.0'],
      },
      appTree,
    );
    const newPpackageJson = JSON.parse(newTree.readContent('/package.json'));
    expect(newPpackageJson['dependencies']['@angular/core'][0]).toBe('6');
  }, 45000);

  it('updates Angular as compatible with Angular N-1 (2)', async () => {
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

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular/core@^6.0.0'],
      },
      appTree,
    );

    const newPackageJson = JSON.parse(newTree.readContent('/package.json'));
    expect(newPackageJson['dependencies']['@angular/core'][0]).toBe('6');
    expect(newPackageJson['dependencies']['rxjs'][0]).toBe('6');
    expect(newPackageJson['dependencies']['typescript'][0]).toBe('2');
    expect(newPackageJson['dependencies']['typescript'][2]).not.toBe('4');
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

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit-tests/update-package-group-1'],
      },
      appTree,
    );
    const { dependencies: deps } = JSON.parse(newTree.readContent('/package.json'));
    expect(deps['@angular-devkit-tests/update-package-group-1']).toBe('1.2.0');
    expect(deps['@angular-devkit-tests/update-package-group-2']).toBe('2.0.0');
  }, 45000);

  it('can migrate only', async () => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.0.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit-tests/update-migrations'],
        migrateOnly: true,
      },
      appTree,
    );

    const newPackageJson = JSON.parse(newTree.readContent('/package.json'));
    expect(newPackageJson['dependencies']['@angular-devkit-tests/update-base']).toBe('1.0.0');
    expect(newPackageJson['dependencies']['@angular-devkit-tests/update-migrations']).toBe('1.0.0');
  }, 45000);

  it('can migrate from only', async () => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.6.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit-tests/update-migrations'],
        migrateOnly: true,
        from: '0.1.2',
      },
      appTree,
    );
    const { dependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(dependencies['@angular-devkit-tests/update-migrations']).toBe('1.6.0');
  }, 45000);

  it('can install and migrate with --from (short version number)', async () => {
    // Add the basic migration package.
    const content = virtualFs.fileBufferToString(host.sync.read(normalize('/package.json')));
    const packageJson = JSON.parse(content);
    packageJson['dependencies']['@angular-devkit-tests/update-migrations'] = '1.6.0';
    host.sync.write(
      normalize('/package.json'),
      virtualFs.stringToFileBuffer(JSON.stringify(packageJson)),
    );

    const newTree = await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit-tests/update-migrations'],
        migrateOnly: true,
        from: '0',
      },
      appTree,
    );
    const { dependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(dependencies['@angular-devkit-tests/update-migrations']).toBe('1.6.0');
  }, 45000);

  it('validates peer dependencies', async () => {
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
    schematicRunner.logger.subscribe((x) => messages.push(x.message));
    const hasPeerdepMsg = (dep: string) =>
      messages.some((str) => str.includes(`missing peer dependency of "${dep}"`));

    await schematicRunner.runSchematic(
      'update',
      {
        packages: ['@angular-devkit/build-angular'],
        next: true,
      },
      appTree,
    );
    expect(hasPeerdepMsg('@angular/compiler-cli')).toBeTruthy();
    expect(hasPeerdepMsg('typescript')).toBeTruthy();
    expect(hasPeerdepMsg('@angular/localize')).toBeFalsy();
  }, 45000);

  it('does not remove newline at the end of package.json', async () => {
    const newlineStyles = ['\n', '\r\n'];
    for (const newline of newlineStyles) {
      const packageJsonContent = `{
        "name": "blah",
        "dependencies": {
          "@angular-devkit-tests/update-base": "1.0.0"
        }
      }${newline}`;
      const inputTree = new UnitTestTree(
        new HostTree(
          new virtualFs.test.TestHost({
            '/package.json': packageJsonContent,
          }),
        ),
      );

      const resultTree = await schematicRunner.runSchematic(
        'update',
        { packages: ['@angular-devkit-tests/update-base'] },
        inputTree,
      );

      const resultTreeContent = resultTree.readContent('/package.json');
      expect(resultTreeContent.endsWith(newline)).toBeTrue();
    }
  });

  it('does not add a newline at the end of package.json', async () => {
    const packageJsonContent = `{
      "name": "blah",
      "dependencies": {
        "@angular-devkit-tests/update-base": "1.0.0"
      }
    }`;
    const inputTree = new UnitTestTree(
      new HostTree(
        new virtualFs.test.TestHost({
          '/package.json': packageJsonContent,
        }),
      ),
    );

    const resultTree = await schematicRunner.runSchematic(
      'update',
      { packages: ['@angular-devkit-tests/update-base'] },
      inputTree,
    );

    const resultTreeContent = resultTree.readContent('/package.json');
    expect(resultTreeContent.endsWith('}')).toBeTrue();
  });
});
