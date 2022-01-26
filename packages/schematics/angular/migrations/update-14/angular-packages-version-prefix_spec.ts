/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to update Angular packages version prefix to `^` instead of `~`', () => {
  const packageJsonPath = '/package.json';
  const schematicName = 'update-angular-packages-version-prefix';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should replace Angular packages versioned with '~' to '^'`, async () => {
    tree.create(
      packageJsonPath,
      JSON.stringify({
        dependencies: {
          '@angular/animations': '~13.1.0',
          '@angular/common': '~13.1.0',
          '@angular/compiler': '~13.1.0',
          '@angular/core': '~13.1.0',
          '@angular/forms': '~13.1.0',
          '@angular/platform-browser': '~13.1.0',
          '@angular/platform-browser-dynamic': '~13.1.0',
          '@angular/router': '~13.1.0',
          '@nguniversal/commom': '^13.1.0',
          'rxjs': '~7.4.0',
          'tslib': '^2.3.0',
          'zone.js': '~0.11.4',
        },
        devDependencies: {
          '@angular-devkit/build-angular': '~13.1.3',
          '@angular/cli': '~13.1.3',
          '@angular/compiler-cli': '~13.1.0',
          '@angular/localize': '^13.1.3',
          '@types/jasmine': '~3.10.0',
          '@types/node': '^12.11.1',
          'jasmine-core': '~3.10.0',
          'karma': '~6.3.0',
          'karma-chrome-launcher': '~3.1.0',
          'karma-coverage': '~2.1.0',
          'karma-jasmine': '~4.0.0',
          'karma-jasmine-html-reporter': '~1.7.0',
          'ng-packagr': '~13.1.3',
          'typescript': '~4.5.2',
        },
      }),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const pkg = JSON.parse(newTree.readContent(packageJsonPath));

    expect(pkg['dependencies']).toEqual({
      '@angular/animations': '^13.1.0',
      '@angular/common': '^13.1.0',
      '@angular/compiler': '^13.1.0',
      '@angular/core': '^13.1.0',
      '@angular/forms': '^13.1.0',
      '@angular/platform-browser': '^13.1.0',
      '@angular/platform-browser-dynamic': '^13.1.0',
      '@angular/router': '^13.1.0',
      '@nguniversal/commom': '^13.1.0',
      'rxjs': '~7.4.0',
      'tslib': '^2.3.0',
      'zone.js': '~0.11.4',
    });

    expect(pkg['devDependencies']).toEqual({
      '@angular-devkit/build-angular': '^13.1.3',
      '@angular/cli': '^13.1.3',
      '@angular/compiler-cli': '^13.1.0',
      '@angular/localize': '^13.1.3',
      '@types/jasmine': '~3.10.0',
      '@types/node': '^12.11.1',
      'jasmine-core': '~3.10.0',
      'karma': '~6.3.0',
      'karma-chrome-launcher': '~3.1.0',
      'karma-coverage': '~2.1.0',
      'karma-jasmine': '~4.0.0',
      'karma-jasmine-html-reporter': '~1.7.0',
      'ng-packagr': '^13.1.3',
      'typescript': '~4.5.2',
    });
  });

  it('should not replace pinned Angular packages versions', async () => {
    tree.create(
      packageJsonPath,
      JSON.stringify({
        dependencies: {
          '@angular/animations': '13.1.0',
          '@angular/core': '~13.1.0',
        },
        devDependencies: {
          '@angular-devkit/build-angular': '13.1.3',
        },
      }),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const pkg = JSON.parse(newTree.readContent(packageJsonPath));

    expect(pkg['dependencies']['@angular/animations']).toBe('13.1.0');
    expect(pkg['dependencies']['@angular/core']).toBe('^13.1.0');
    expect(pkg['devDependencies']['@angular-devkit/build-angular']).toBe('13.1.3');
  });

  it('should not error when `dependencies` is missing', async () => {
    tree.create(
      packageJsonPath,
      JSON.stringify({
        devDependencies: {
          '@angular-devkit/build-angular': '~13.1.3',
        },
      }),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const pkg = JSON.parse(newTree.readContent(packageJsonPath));

    expect(pkg['dependencies']).toBeUndefined();
    expect(pkg['devDependencies']['@angular-devkit/build-angular']).toBe('^13.1.3');
  });

  it('should not error when `devDependencies` is missing', async () => {
    tree.create(
      packageJsonPath,
      JSON.stringify({
        dependencies: {
          '@angular-devkit/build-angular': '~13.1.3',
        },
      }),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const pkg = JSON.parse(newTree.readContent(packageJsonPath));

    expect(pkg['dependencies']['@angular-devkit/build-angular']).toBe('^13.1.3');
    expect(pkg['devDependencies']).toBeUndefined();
  });
});
