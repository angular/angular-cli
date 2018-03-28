/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as UniversalOptions } from './schema';

describe('Universal Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: UniversalOptions = {
    clientProject: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'Emulated',
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a root module file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    expect(tree.exists(filePath)).toEqual(true);
  });

  it('should create a main file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/main.server.ts';
    expect(tree.exists(filePath)).toEqual(true);
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/export { AppServerModule } from '\.\/app\/app\.server\.module'/);
  });

  it('should create a tsconfig file', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/tsconfig.server.json';
    expect(tree.exists(filePath)).toEqual(true);
    const contents = tree.readContent(filePath);
    expect(contents).toMatch('../../out-tsc/app-server');
  });

  it('should add dependency: @angular/platform-server', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/\"@angular\/platform-server\": \"/);
  });

  it('should update workspace with a server target', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/angular.json';
    const contents = tree.readContent(filePath);
    const config = JSON.parse(contents.toString());
    const arch = config.projects.bar.architect;
    expect(arch.server).toBeDefined();
    expect(arch.server.builder).toBeDefined();
    const opts = arch.server.options;
    expect(opts.outputPath).toEqual('dist/bar-server');
    expect(opts.main).toEqual('projects/bar/src/main.server.ts');
    expect(opts.tsConfig).toEqual('projects/bar/tsconfig.server.json');
  });

  it('should add a server transition to BrowerModule import', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.module.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/BrowserModule\.withServerTransition\({ appId: 'serverApp' }\)/);
  });

  it('should wrap the bootstrap call in a DOMContentLoaded event handler', () => {
    const tree = schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/main.ts';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/document.addEventListener\('DOMContentLoaded', \(\) => {/);
  });
});
