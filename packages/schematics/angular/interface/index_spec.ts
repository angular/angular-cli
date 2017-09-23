/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import * as path from 'path';
import { getFileContent } from '../utility/test';
import { Schema as InterfaceSchema } from './schema';


describe('Interface Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: InterfaceSchema = {
    name: 'foo',
    path: 'app',
    prefix: '',
    sourceDir: 'src',
    type: '',
  };

  it('should create one file', () => {
    const tree = schematicRunner.runSchematic('interface', defaultOptions);
    expect(tree.files.length).toEqual(1);
    expect(tree.files[0]).toEqual('/src/app/foo.ts');
  });

  it('should create an interface named "Foo"', () => {
    const tree = schematicRunner.runSchematic('interface', defaultOptions);
    const fileContent = getFileContent(tree, '/src/app/foo.ts');
    expect(fileContent).toMatch(/export interface Foo/);
  });

  it('should put type in the file name', () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = schematicRunner.runSchematic('interface', options);
    expect(tree.files[0]).toEqual('/src/app/foo.model.ts');
  });

});
