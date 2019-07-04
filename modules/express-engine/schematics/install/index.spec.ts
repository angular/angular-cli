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

  it('should add dependency: @nguniversal/module-map-ngfactory-loader',
     async () => {
       const tree = await schematicRunner
                        .runSchematicAsync('ng-add', defaultOptions, appTree)
                        .toPromise();
       const filePath = '/package.json';
       const contents = tree.readContent(filePath);
       expect(contents).toMatch(
           /\"@nguniversal\/module-map-ngfactory-loader\": \"/);
     });

  it('should add dependency: @nguniversal/express-engine', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"@nguniversal\/express-engine\": \"/);
  });

  it('should add dependency: express', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"express\": \"/);
  });

  it('should add dependency: ts-loader', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"ts-loader\": \"/);
  });

  it('should add dependency: webpack-cli', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"webpack-cli\": \"/);
  });

  it('should not add dependency: ts-loader when webpack is false', async () => {
    const noWebpack = Object.assign({}, defaultOptions);
    noWebpack.webpack = false;
    const tree =
        await schematicRunner.runSchematicAsync('ng-add', noWebpack, appTree)
            .toPromise();
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).not.toContain('ts-loader');
  });

  it('should not add dependency: webpack-cli when webpack is false',
     async () => {
       const noWebpack = Object.assign({}, defaultOptions);
       noWebpack.webpack = false;
       const tree =
           await schematicRunner.runSchematicAsync('ng-add', noWebpack, appTree)
               .toPromise();
       const filePath = '/package.json';
       const contents = tree.readContent(filePath);
       expect(contents).not.toContain('webpack-cli');
     });

  it('should install npm dependencies', async () => {
    await schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree)
        .toPromise();
    expect(schematicRunner.tasks.length).toBe(2);
    expect(schematicRunner.tasks[0].name).toBe('node-package');
    expect((schematicRunner.tasks[0].options as {command: string}).command)
        .toBe('install');
  });

  it('should not add Universal files', async () => {
    const noUniversal = Object.assign({}, defaultOptions);
    noUniversal.skipUniversal = true;

    const tree =
        await schematicRunner.runSchematicAsync('ng-add', noUniversal, appTree)
            .toPromise();
    const filePath = '/projects/bar/src/main.server.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch('');
  });

  it('should add module map loader to server module imports', async () => {
    const tree = await schematicRunner
                     .runSchematicAsync('ng-add', defaultOptions, appTree)
                     .toPromise();
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toContain('ModuleMapLoaderModule');
  });

  it('should add exports to main server file', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('ng-add', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/main.server.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toContain('ngExpressEngine');
    expect(contents).toContain('provideModuleMap');
  });

  it('should update angular.json', async () => {
    const tree = await schematicRunner
      .runSchematicAsync('ng-add', defaultOptions, appTree)
      .toPromise();
    const contents = JSON.parse(tree.readContent('angular.json'));
    const architect = contents.projects.bar.architect;
    expect(architect.build.configurations.production).toBeDefined();
    expect(architect.build.options.outputPath).toBe('dist/browser');
    expect(architect.server.options.outputPath).toBe('dist/server');

    const productionConfig = architect.server.configurations.production;
    expect(productionConfig.fileReplacements).toBeDefined();
    expect(productionConfig.optimization).toBeDefined();
    expect(productionConfig.sourceMap).toBeDefined();
  });
});
