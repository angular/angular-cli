/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import { Schema as InterfaceSchema } from './schema';


describe('Interface Schematic', () => {
  const schematicRunner = new SchematicTestRunner('@schematics/angular');
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
    const fileEntry = tree.get(tree.files[0]);
    if (fileEntry) {
      const fileContent = fileEntry.content.toString();
      expect(fileContent).toMatch(/export interface Foo/);
    }
  });

  it('should put type in the file name', () => {
    const options = { ...defaultOptions, type: 'model' };

    const tree = schematicRunner.runSchematic('interface', options);
    expect(tree.files[0]).toEqual('/src/app/foo.model.ts');
  });

});
