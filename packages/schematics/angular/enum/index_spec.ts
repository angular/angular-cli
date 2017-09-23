/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import * as path from 'path';
import { Schema as EnumSchematic } from './schema';


describe('Enum Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: EnumSchematic = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
  };

  it('should create an enumeration', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('enum', options);
    const files = tree.files;
    expect(files.length).toEqual(1);
    expect(files.indexOf('/src/app/foo.enum.ts')).toBeGreaterThanOrEqual(0);
  });


});
