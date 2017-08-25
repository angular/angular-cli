/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '../utility/schematic-test-runner';
import { Schema as ComponentSchema } from './schema';


describe('Component Schematic', () => {
  const schematicRunner = new SchematicTestRunner('@schematics/angular');
  const defaultOptions: ComponentSchema = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'None',
    changeDetection: 'Default',
    routing: false,
    styleext: 'css',
    spec: true,
    module: undefined,
    export: false,
    prefix: undefined,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = SchematicTestRunner.createAppNgModule(appTree);
  });

  it('should create a component', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.component.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.component.ts')).toBeGreaterThanOrEqual(0);
  });


});
