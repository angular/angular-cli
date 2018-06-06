/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from './schema';


describe('Workspace Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: WorkspaceOptions = {
    name: 'foo',
    version: '6.0.0',
  };

  it('should create all files of a workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('workspace', options);
    const files = tree.files;
    expect(files.indexOf('/.editorconfig')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/angular.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/.gitignore')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/README.md')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/tsconfig.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/tslint.json')).toBeGreaterThanOrEqual(0);
  });

  it('should set the name in package.json', () => {
    const tree = schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.name).toEqual('foo');
  });

  it('should set the CLI version in package.json', () => {
    const tree = schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.devDependencies['@angular/cli']).toMatch('6.0.0');
  });

  it('should use the latest known versions in package.json', () => {
    const tree = schematicRunner.runSchematic('workspace', defaultOptions);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['@angular/core']).toEqual(latestVersions.Angular);
    expect(pkg.dependencies['rxjs']).toEqual(latestVersions.RxJs);
    expect(pkg.dependencies['zone.js']).toEqual(latestVersions.ZoneJs);
    expect(pkg.devDependencies['typescript']).toEqual(latestVersions.TypeScript);
  });
});
