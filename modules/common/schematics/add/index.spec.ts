/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Tree} from '@angular-devkit/schematics';
import {SchematicTestRunner} from '@angular-devkit/schematics/testing';

import {collectionPath, createTestApp} from '../testing/test-app';

import {addUniversalCommonRule, AddUniversalOptions} from './index';

describe('Add Schematic Rule', () => {
  const defaultOptions: AddUniversalOptions = {
    clientProject: 'bar',
    serverFileName: 'server.ts',
  };

  let schematicRunner: SchematicTestRunner;
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestApp().toPromise();
    schematicRunner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should update angular.json', async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();
    const contents = JSON.parse(tree.read('angular.json')!.toString());
    const architect = contents.projects.bar.architect;
    expect(architect.build.configurations.production).toBeDefined();
    expect(architect.build.options.outputPath).toBe('dist/bar/browser');
    expect(architect.server.options.outputPath).toBe('dist/bar/server');

    const productionConfig = architect.server.configurations.production;
    expect(productionConfig.fileReplacements).toBeDefined();
    expect(productionConfig.sourceMap).toBeDefined();
    expect(productionConfig.optimization).toBeDefined();
  });

  it(`should update 'tsconfig.server.json' files with main file`, async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();

    const contents = JSON.parse(tree.read('/projects/bar/tsconfig.server.json')!.toString());
    expect(contents.files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });

  it(`should work when server target already exists`, async () => {
    appTree = await schematicRunner
      .runExternalSchematicAsync('@schematics/angular', 'universal', defaultOptions, appTree)
      .toPromise();

    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();

    const contents = JSON.parse(tree.read('/projects/bar/tsconfig.server.json')!.toString());
    expect(contents.files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });
});
