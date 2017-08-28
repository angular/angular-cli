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
import { Schema as ModuleSchema } from './schema';


describe('Module Schematic', () => {
  const schematicRunner = new SchematicTestRunner('@schematics/angular');
  const defaultOptions: ModuleSchema = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    flat: false,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a module', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('module', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.module.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.module.ts')).toBeGreaterThanOrEqual(0);
  });


});
