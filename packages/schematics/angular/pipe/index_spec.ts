/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import { createAppModule } from '../utility/test';
import { Schema as PipeSchemna } from './schema';


describe('Pipe Schematic', () => {
  const schematicRunner = new SchematicTestRunner('@schematics/angular');
  const defaultOptions: PipeSchemna = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    export: false,
    flat: true,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a pipe', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('pipe', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.pipe.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.pipe.ts')).toBeGreaterThanOrEqual(0);
  });


});
