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


// tslint:disable:max-line-length
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

  beforeEach(() => {
    appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);
    appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'application', appOptions, appTree);
  });

  it('should run the service worker schematic', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect.build.configurations.production.serviceWorker;
    expect(swFlag).toEqual(true);
  });

  it('should create icon files', () => {
    const dimensions = [72, 96, 128, 144, 152, 192, 384, 512];
    const iconPath = '/projects/bar/src/assets/icons/icon-';
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    dimensions.forEach(d => {
      const path = `${iconPath}${d}x${d}.png`;
      expect(tree.exists(path)).toEqual(true);
    });
  });

  it('should create a manifest file', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    expect(tree.exists('/projects/bar/src/manifest.json')).toEqual(true);
  });

  it('should set the name & short_name in the manifest file', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const manifestText = tree.readContent('/projects/bar/src/manifest.json');
    const manifest = JSON.parse(manifestText);
    expect(manifest.name).toEqual(defaultOptions.title);
    expect(manifest.short_name).toEqual(defaultOptions.title);
  });

  it('should set the name & short_name in the manifest file when no title provided', () => {
    const options = {...defaultOptions, title: undefined};
    const tree = schematicRunner.runSchematic('ng-add', options, appTree);
    const manifestText = tree.readContent('/projects/bar/src/manifest.json');
    const manifest = JSON.parse(manifestText);
    expect(manifest.name).toEqual(defaultOptions.project);
    expect(manifest.short_name).toEqual(defaultOptions.project);
  });

  it('should update the index file', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const content = tree.readContent('projects/bar/src/index.html');

    expect(content).toMatch(/<link rel="manifest" href="manifest.json">/);
    expect(content).toMatch(/<meta name="theme-color" content="#1976d2">/);
    expect(content)
      .toMatch(/<noscript>Please enable JavaScript to continue using this application.<\/noscript>/);
  });

  it('should update the build and test assets configuration', () => {
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const architect = config.projects.bar.architect;
    ['build', 'test'].forEach((target) => {
      expect(architect[target].options.assets).toContain('projects/bar/src/manifest.json');
    });
  });
});
