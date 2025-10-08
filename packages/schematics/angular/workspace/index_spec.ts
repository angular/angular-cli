/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
    const tree = await schematicRunner.runSchematic('workspace', options);
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/.vscode/extensions.json',
        '/.vscode/launch.json',
        '/.vscode/tasks.json',
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
    const tree = await schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.name).toEqual('foo');
  });

  it('should set the CLI version in package.json', async () => {
    const tree = await schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.devDependencies['@angular/cli']).toMatch('6.0.0');
  });

  it('should use the latest known versions in package.json', async () => {
    const tree = await schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['@angular/core']).toEqual(latestVersions.Angular);
    expect(pkg.dependencies['rxjs']).toEqual(latestVersions['rxjs']);
    expect(pkg.devDependencies['typescript']).toEqual(latestVersions['typescript']);
  });

  it('should create correct files when using minimal', async () => {
    const tree = await schematicRunner.runSchematic('workspace', {
      ...defaultOptions,
      minimal: true,
    });
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/.vscode/extensions.json',
        '/.vscode/launch.json',
        '/.vscode/tasks.json',
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
    const tree = await schematicRunner.runSchematic('workspace', defaultOptions);
    const { angularCompilerOptions } = parseJson(tree.readContent('tsconfig.json').toString());
    expect(angularCompilerOptions.enableI18nLegacyMessageIdFormat).toBe(false);
  });

  it('should not add strict compiler options when false', async () => {
    const tree = await schematicRunner.runSchematic('workspace', {
      ...defaultOptions,
      strict: false,
    });
    const { compilerOptions, angularCompilerOptions } = parseJson(
      tree.readContent('tsconfig.json').toString(),
    );
    expect(compilerOptions.strict).toBeUndefined();
    expect(
      Object.keys(angularCompilerOptions).filter((option) => option.startsWith('strict')),
    ).toEqual([]);
  });

  it('should add strict compiler options when true', async () => {
    const tree = await schematicRunner.runSchematic('workspace', {
      ...defaultOptions,
      strict: true,
    });
    const { compilerOptions, angularCompilerOptions } = parseJson(
      tree.readContent('tsconfig.json').toString(),
    );
    expect(compilerOptions.strict).toBe(true);
    expect(angularCompilerOptions.strictTemplates).toBe(true);
  });

  it('should add vscode testing configuration', async () => {
    const tree = await schematicRunner.runSchematic('workspace', { ...defaultOptions });
    const { configurations } = parseJson(tree.readContent('.vscode/launch.json').toString());
    expect(configurations).toContain(jasmine.objectContaining({ name: 'ng test' }));
    const { tasks } = parseJson(tree.readContent('.vscode/tasks.json').toString());
    expect(tasks).toContain(jasmine.objectContaining({ type: 'npm', script: 'test' }));
  });

  it('should not add vscode testing configuration when using minimal', async () => {
    const tree = await schematicRunner.runSchematic('workspace', {
      ...defaultOptions,
      minimal: true,
    });
    const { configurations } = parseJson(tree.readContent('.vscode/launch.json').toString());
    expect(configurations).not.toContain(jasmine.objectContaining({ name: 'ng test' }));
    const { tasks } = parseJson(tree.readContent('.vscode/tasks.json').toString());
    expect(tasks).not.toContain(jasmine.objectContaining({ type: 'npm', script: 'test' }));
  });

  it('should include prettier config overrides for Angular templates', async () => {
    const tree = await schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.prettier).withContext('package.json#prettier is present').toBeTruthy();
  });
});
