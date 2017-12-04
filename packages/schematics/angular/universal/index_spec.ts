/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as UniversalOptions } from './schema';


describe('Universal Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: UniversalOptions = {
    name: 'foo',
  };

  let appTree: Tree;

  beforeEach(() => {
    const appOptions: ApplicationOptions = {
      directory: '',
      name: 'app',
      prefix: '',
      sourceDir: 'src',
      inlineStyle: false,
      inlineTemplate: false,
      viewEncapsulation: 'None',
      version: '1.2.3',
      routing: false,
      style: 'css',
      skipTests: false,
      minimal: false,
    };
    appTree = schematicRunner.runSchematic('application', appOptions);
  });

  it('should create a root module file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/src/app/app.server.module.ts';
    const file = tree.files.filter(f => f === filePath)[0];
    expect(file).toBeDefined();
  });

  it('should create a main file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/src/main.server.ts';
    const file = tree.files.filter(f => f === filePath)[0];
    expect(file).toBeDefined();
    const contents = tree.read(filePath);
    expect(contents).toMatch(/export { AppServerModule } from '\.\/app\/app\.server\.module'/);
  });

  it('should create a tsconfig file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/src/tsconfig.server.json';
    const file = tree.files.filter(f => f === filePath)[0];
    expect(file).toBeDefined();
    const contents = tree.read(filePath);
    expect(contents).toMatch(/\"outDir\": \"\.\.\/dist-server\/\"/);
  });

  it('should add dependency: @angular/platform-server', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.read(filePath);
    expect(contents).toMatch(/\"@angular\/platform-server\": \"/);
  });

  it('should update .angular-cli.json with a server app', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/.angular-cli.json';
    const contents = tree.read(filePath) || new Buffer('');

    const config = JSON.parse(contents.toString());
    expect(config.apps.length).toEqual(2);
    const app = config.apps[1];
    expect(app.platform).toEqual('server');
    expect(app.root).toEqual('src');
    expect(app.outDir).toEqual('dist-server/');
    expect(app.index).toEqual('index.html');
    expect(app.main).toEqual('main.server.ts');
    expect(app.test).toEqual('test.ts');
    expect(app.tsconfig).toEqual('tsconfig.server.json');
    expect(app.testTsconfig).toEqual('tsconfig.spec.json');
    expect(app.environmentSource).toEqual('environments/environment.ts');
  });

  it('should add a server transition to BrowerModule import', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/src/app/app.module.ts';
    const contents = tree.read(filePath);
    expect(contents).toMatch(/BrowserModule\.withServerTransition\({ appId: 'serverApp' }\)/);
  });

  it('should wrap the bootstrap call in a DOMContentLoaded event handler', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/src/main.ts';
    const contents = tree.read(filePath);
    expect(contents).toMatch(/document.addEventListener\('DOMContentLoaded', \(\) => {/);
  });
});
