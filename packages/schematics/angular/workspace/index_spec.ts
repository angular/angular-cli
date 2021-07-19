/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from './schema';

describe('Workspace Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: WorkspaceOptions = {
    name: 'foo',
    version: '6.0.0',
  };

  it('should create all files of a workspace', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('workspace', options).toPromise();
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/.editorconfig',
        '/angular.json',
        '/.gitignore',
        '/package.json',
        '/README.md',
        '/tsconfig.json',
      ]),
    );
  });

  it('should set the name in package.json', async () => {
    const tree = await schematicRunner.runSchematicAsync('workspace', defaultOptions).toPromise();
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.name).toEqual('foo');
  });

  it('should set the CLI version in package.json', async () => {
    const tree = await schematicRunner.runSchematicAsync('workspace', defaultOptions).toPromise();
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.devDependencies['@angular/cli']).toMatch('6.0.0');
  });

  it('should use the latest known versions in package.json', async () => {
    const tree = await schematicRunner.runSchematicAsync('workspace', defaultOptions).toPromise();
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['@angular/core']).toEqual(latestVersions.Angular);
    expect(pkg.dependencies['rxjs']).toEqual(latestVersions['rxjs']);
    expect(pkg.dependencies['zone.js']).toEqual(latestVersions['zone.js']);
    expect(pkg.devDependencies['typescript']).toEqual(latestVersions['typescript']);
  });

  it('should create correct files when using minimal', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('workspace', { ...defaultOptions, minimal: true })
      .toPromise();
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/angular.json',
        '/.gitignore',
        '/package.json',
        '/README.md',
        '/tsconfig.json',
      ]),
    );

    expect(files).not.toContain('/.editorconfig');
  });

  it('should set the `enableI18nLegacyMessageIdFormat` Angular compiler option', async () => {
    const tree = await schematicRunner.runSchematicAsync('workspace', defaultOptions).toPromise();
    const { angularCompilerOptions } = parseJson(tree.readContent('tsconfig.json').toString());
    expect(angularCompilerOptions.enableI18nLegacyMessageIdFormat).toBe(false);
  });

  it('should not add strict compiler options when false', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('workspace', { ...defaultOptions, strict: false })
      .toPromise();
    const { compilerOptions, angularCompilerOptions } = parseJson(
      tree.readContent('tsconfig.json').toString(),
    );
    expect(compilerOptions.strict).toBeUndefined();
    expect(
      Object.keys(angularCompilerOptions).filter((option) => option.startsWith('strict')),
    ).toEqual([]);
  });

  it('should add strict compiler options when true', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('workspace', { ...defaultOptions, strict: true })
      .toPromise();
    const { compilerOptions, angularCompilerOptions } = parseJson(
      tree.readContent('tsconfig.json').toString(),
    );
    expect(compilerOptions.strict).toBe(true);
    expect(angularCompilerOptions.strictTemplates).toBe(true);
  });
});
