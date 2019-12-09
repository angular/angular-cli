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
    clientProject: 'test-app',
    serverFileName: 'server.ts',
  };

  let schematicRunner: SchematicTestRunner;
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestApp();
    schematicRunner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should update angular.json', async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();
    const contents = JSON.parse(tree.read('angular.json')!.toString());
    const architect = contents.projects['test-app'].architect;
    expect(architect.build.configurations.production).toBeDefined();
    expect(architect.build.options.outputPath).toBe('dist/test-app/browser');
    expect(architect.server.options.outputPath).toBe('dist/test-app/server');
    expect(architect.server.options.main).toBe('projects/test-app/server.ts');
    expect(architect['serve-ssr'].options.serverTarget).toBe('test-app:server');
    expect(architect['serve-ssr'].options.browserTarget).toBe('test-app:build');
    expect(architect['prerender'].options.serverTarget).toBe('test-app:server:production');
    expect(architect['prerender'].options.browserTarget).toBe('test-app:build:production');

    const productionConfig = architect.server.configurations.production;
    expect(productionConfig.fileReplacements).toBeDefined();
    expect(productionConfig.sourceMap).toBeDefined();
    expect(productionConfig.optimization).toBeDefined();

    const productionServeSSRConfig = architect['serve-ssr'].configurations.production;
    expect(productionServeSSRConfig.serverTarget).toBe('test-app:server:production');
    expect(productionServeSSRConfig.browserTarget).toBe('test-app:build:production');
  });

  it('should add scripts to package.json', async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();
    const {scripts} = JSON.parse(tree.read('package.json')!.toString());
    expect(scripts['build:ssr']).toBe('ng build --prod && ng run test-app:server:production');
    expect(scripts['serve:ssr']).toBe('node dist/test-app/server/main.js');
    expect(scripts['dev:ssr']).toBe('ng run test-app:serve-ssr');
    expect(scripts['prerender']).toBe('ng run test-app:prerender');
  });

  it('should add devDependency: @nguniversal/builders', async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();
    const {devDependencies} = JSON.parse(tree.read('package.json')!.toString());
    expect(Object.keys(devDependencies)).toContain('@nguniversal/builders');
  });

  it(`should update 'tsconfig.server.json' files with main file`, async () => {
    const tree = await schematicRunner
      .callRule(addUniversalCommonRule(defaultOptions), appTree).toPromise();

    const contents = JSON.parse(tree.read('/projects/test-app/tsconfig.server.json')!.toString());
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

    const contents = JSON.parse(tree.read('/projects/test-app/tsconfig.server.json')!.toString());
    expect(contents.files).toEqual([
      'src/main.server.ts',
      'server.ts',
    ]);
  });
});
