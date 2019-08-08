/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as PwaOptions } from './schema';

describe('PWA Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@angular/pwa',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: PwaOptions = {
    project: 'bar',
    target: 'build',
    configuration: 'production',
    title: 'Fake Title',
  };

  let appTree: UnitTestTree;

  // tslint:disable-next-line:no-any
  const workspaceOptions: any = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  // tslint:disable-next-line:no-any
  const appOptions: any = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runExternalSchematicAsync(
      '@schematics/angular',
      'application',
      appOptions,
      appTree,
    ).toPromise();
  });

  it('should run the service worker schematic', (done) => {
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      const configText = tree.readContent('/angular.json');
      const config = JSON.parse(configText);
      const swFlag = config.projects.bar.architect.build.configurations.production.serviceWorker;
      expect(swFlag).toEqual(true);
      done();
    }, done.fail);
  });

  it('should create icon files', (done) => {
    const dimensions = [72, 96, 128, 144, 152, 192, 384, 512];
    const iconPath = '/projects/bar/src/assets/icons/icon-';
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      dimensions.forEach(d => {
        const path = `${iconPath}${d}x${d}.png`;
        expect(tree.exists(path)).toEqual(true);
      });
      done();
    }, done.fail);
  });

  it('should create a manifest file', (done) => {
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      expect(tree.exists('/projects/bar/src/manifest.webmanifest')).toEqual(true);
      done();
    }, done.fail);
  });

  it('should set the name & short_name in the manifest file', (done) => {
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      const manifestText = tree.readContent('/projects/bar/src/manifest.webmanifest');
      const manifest = JSON.parse(manifestText);

      expect(manifest.name).toEqual(defaultOptions.title);
      expect(manifest.short_name).toEqual(defaultOptions.title);
      done();
    }, done.fail);
  });

  it('should set the name & short_name in the manifest file when no title provided', (done) => {
    const options = {...defaultOptions, title: undefined};
    schematicRunner.runSchematicAsync('ng-add', options, appTree).toPromise().then(tree => {
      const manifestText = tree.readContent('/projects/bar/src/manifest.webmanifest');
      const manifest = JSON.parse(manifestText);

      expect(manifest.name).toEqual(defaultOptions.project);
      expect(manifest.short_name).toEqual(defaultOptions.project);
      done();
    }, done.fail);
  });

  it('should update the index file', (done) => {
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      const content = tree.readContent('projects/bar/src/index.html');

      expect(content).toMatch(/<link rel="manifest" href="manifest.webmanifest">/);
      expect(content).toMatch(/<meta name="theme-color" content="#1976d2">/);
      expect(content)
        .toMatch(/<noscript>Please enable JavaScript to continue using this application.<\/noscript>/);
      done();
    }, done.fail);
  });

  it('should not add noscript element to the index file if already present', (done) => {
    let index = appTree.readContent('projects/bar/src/index.html');
    index = index.replace('</body>', '<noscript>NO JAVASCRIPT</noscript></body>');
    appTree.overwrite('projects/bar/src/index.html', index);
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      const content = tree.readContent('projects/bar/src/index.html');

      expect(content).toMatch(/<link rel="manifest" href="manifest.webmanifest">/);
      expect(content).toMatch(/<meta name="theme-color" content="#1976d2">/);
      expect(content).not
        .toMatch(/<noscript>Please enable JavaScript to continue using this application.<\/noscript>/);
      expect(content).toMatch(/<noscript>NO JAVASCRIPT<\/noscript>/);
      done();
    }, done.fail);
  });

  it('should update the build and test assets configuration', (done) => {
    schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).toPromise().then(tree => {
      const configText = tree.readContent('/angular.json');
      const config = JSON.parse(configText);
      const targets = config.projects.bar.architect;

      ['build', 'test'].forEach((target) => {
        expect(targets[target].options.assets).toContain('projects/bar/src/manifest.webmanifest');
      });
      done();
    }, done.fail);
  });
});
