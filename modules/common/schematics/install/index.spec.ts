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

import {Schema as UniversalOptions} from './schema';

describe('Universal Schematic', () => {
  const defaultOptions: UniversalOptions = {
    clientProject: 'bar',
  };

  let schematicRunner: SchematicTestRunner;
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestApp().toPromise();
    schematicRunner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should update angular.json', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('install', defaultOptions, appTree)
      .toPromise();
    const contents = JSON.parse(tree.readContent('angular.json'));
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
      .runSchematicAsync('install', defaultOptions, appTree)
      .toPromise();

    const contents = JSON.parse(tree.readContent('/projects/bar/tsconfig.server.json'));
    expect(contents.files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });
});
