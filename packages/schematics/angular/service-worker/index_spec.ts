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
import { Schema as ServiceWorkerOptions } from './schema';


describe('Service Worker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ServiceWorkerOptions = {
    project: 'bar',
    target: 'build',
    configuration: 'production',
  };

  let appTree: UnitTestTree;

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should update the proudction configuration', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect.build.configurations.production.serviceWorker;
    expect(swFlag).toEqual(true);
  });

  it('should update the target options if no configuration is set', () => {
    const options = {...defaultOptions, configuration: ''};
    const tree = schematicRunner.runSchematic('service-worker', options, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect.build.options.serviceWorker;
    expect(swFlag).toEqual(true);
  });

  it('should add the necessary dependency', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/package.json');
    const pkg = JSON.parse(pkgText);
    const version = pkg.dependencies['@angular/core'];
    expect(pkg.dependencies['@angular/service-worker']).toEqual(version);
  });

  it('should import ServiceWorkerModule', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ ServiceWorkerModule \} from '@angular\/service-worker'/);
  });

  it('should import environment', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ environment \} from '\.\.\/environments\/environment'/);
  });

  it('should add the SW import to the NgModule imports', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    // tslint:disable-next-line:max-line-length
    const expectedText = 'ServiceWorkerModule.register(\'ngsw-worker.js\', { enabled: environment.production })';
    expect(pkgText).toContain(expectedText);
  });

  it('should put the ngsw-config.json file in the project root', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const path = '/projects/bar/ngsw-config.json';
    expect(tree.exists(path)).toEqual(true);
  });
});
