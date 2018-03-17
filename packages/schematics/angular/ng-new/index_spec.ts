/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as NgNewOptions } from './schema';


describe('Ng New Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: NgNewOptions = {
    name: 'foo',
    directory: 'bar',
    version: '6.0.0',
  };

  it('should create files of a workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files.indexOf('/bar/angular.json')).toBeGreaterThanOrEqual(0);
  });

  it('should create files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files.indexOf('/bar/projects/foo/tsconfig.app.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/bar/projects/foo/src/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/bar/projects/foo/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
  });
});
