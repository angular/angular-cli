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
import { Schema as ServiceWorkerOptions } from './schema';


describe('Service Worker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ServiceWorkerOptions = {
    app: '0',
  };

  let appTree: UnitTestTree;
  const appOptions: ApplicationOptions = {
    directory: '',
    name: 'appshell-app',
    sourceDir: 'src',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'None',
    version: '1.2.3',
    routing: true,
    style: 'css',
    skipTests: false,
    minimal: false,
  };

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('application', appOptions);
  });

  it('should update the config file', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const configText = tree.readContent('/.angular-cli.json');
    const config = JSON.parse(configText);
    expect(config.apps[0].serviceWorker).toEqual(true);
  });

  it('should add the necessary dependency', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/package.json');
    const pkg = JSON.parse(pkgText);
    const version = pkg.dependencies['@angular/core'];
    expect(pkg.dependencies['@angular/platform-server']).toEqual(version);
  });

  it('should import ServiceWorkerModule', () => {
    //// import { ServiceWorkerModule } from '@angular/service-worker';
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ ServiceWorkerModule \} from '@angular\/service-worker'/);
  });

  it('should import environment', () => {
    //// import { ServiceWorkerModule } from '@angular/service-worker';
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ environment \} from '\.\.\/environments\/environment'/);
  });

  it('should add the SW import to the NgModule imports', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/src/app/app.module.ts');
    // tslint:disable-next-line:max-line-length
    const regex = /ServiceWorkerModule\.register\('\/ngsw-worker.js\', { enabled: environment.production }\)/;
    expect(pkgText).toMatch(regex);

  });
});
