/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '../utility/schematic-test-runner';
import { Schema as ServiceSchema } from './schema';


describe('Pipe Schematic', () => {
  const schematicRunner = new SchematicTestRunner('@schematics/angular');
  const defaultOptions: ServiceSchema = {
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
    appTree = SchematicTestRunner.createAppNgModule(appTree);
  });

  it('should create a service', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('service', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.service.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.service.ts')).toBeGreaterThanOrEqual(0);
  });


});
