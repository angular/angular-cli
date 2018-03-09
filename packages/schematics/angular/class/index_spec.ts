/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { getFileContent } from '../utility/test';
import { Schema as ClassOptions } from './schema';


describe('Class Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ClassOptions = {
    name: 'foo',
    path: 'src/app',
    type: '',
    spec: false,
  };

  it('should create one file', () => {
    const tree = schematicRunner.runSchematic('class', defaultOptions);
    expect(tree.files.length).toEqual(1);
    expect(tree.files[0]).toEqual('/src/app/foo.ts');
  });

  it('should create two files if spec is true', () => {
    const options = {
      ...defaultOptions,
      spec: true,
    };
    const tree = schematicRunner.runSchematic('class', options);
    expect(tree.files.length).toEqual(2);
    expect(tree.files.indexOf('/src/app/foo.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(tree.files.indexOf('/src/app/foo.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create an class named "Foo"', () => {
    const tree = schematicRunner.runSchematic('class', defaultOptions);
    const fileEntry = tree.get(tree.files[0]);
    if (fileEntry) {
      const fileContent = fileEntry.content.toString();
      expect(fileContent).toMatch(/export class Foo/);
    }
  });

  it('should put type in the file name', () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = schematicRunner.runSchematic('class', options);
    expect(tree.files[0]).toEqual('/src/app/foo.model.ts');
  });

  it('should split the name to name & type with split on "."', () => {
    const options = {...defaultOptions, name: 'foo.model' };
    const tree = schematicRunner.runSchematic('class', options);
    expect(tree.files.length).toEqual(1);
    expect(tree.files[0]).toEqual('/src/app/foo.model.ts');
    const content = getFileContent(tree, '/src/app/foo.model.ts');
    expect(content).toMatch(/export class Foo/);
  });

  it('should respect the path option', () => {
    const options = { ...defaultOptions, path: 'zzz' };
    const tree = schematicRunner.runSchematic('class', options);
    expect(tree.files.length).toEqual(1);
    expect(tree.files[0]).toEqual('/zzz/foo.ts');
  });
});
