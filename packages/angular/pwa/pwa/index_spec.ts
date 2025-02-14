/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'node:path';
import { Schema as PwaOptions } from './schema';

describe('PWA Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@angular/pwa',
    require.resolve(path.join(__dirname, '../collection.json')),
  );
  const defaultOptions: PwaOptions = {
    project: 'bar',
    target: 'build',
    title: 'Fake Title',
  };

  let appTree: UnitTestTree;

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions,
    );
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'application',
      appOptions,
      appTree,
    );
  });

  it('should create icon files', async () => {
    const dimensions = [72, 96, 128, 144, 152, 192, 384, 512];
    const iconPath = '/projects/bar/public/icons/icon-';
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

    dimensions.forEach((d) => {
      const path = `${iconPath}${d}x${d}.png`;
      expect(tree.exists(path)).toBeTrue();
    });
  });

  it('should reference the icons in the manifest correctly', async () => {
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const manifestText = tree.readContent('/projects/bar/public/manifest.webmanifest');
    const manifest = JSON.parse(manifestText);
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^icons\/icon-\d+x\d+.png/);
    }
  });

  it('should run the service worker schematic', async () => {
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect.build.configurations.production.serviceWorker;

    expect(swFlag).toBe('projects/bar/ngsw-config.json');
  });

  it('should create a manifest file', async () => {
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    expect(tree.exists('/projects/bar/public/manifest.webmanifest')).toBeTrue();
  });

  it('should set the name & short_name in the manifest file', async () => {
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

    const manifestText = tree.readContent('/projects/bar/public/manifest.webmanifest');
    const manifest = JSON.parse(manifestText);

    expect(manifest.name).toEqual(defaultOptions.title);
    expect(manifest.short_name).toEqual(defaultOptions.title);
  });

  it('should set the name & short_name in the manifest file when no title provided', async () => {
    const options = { ...defaultOptions, title: undefined };
    const tree = await schematicRunner.runSchematic('ng-add', options, appTree);

    const manifestText = tree.readContent('/projects/bar/public/manifest.webmanifest');
    const manifest = JSON.parse(manifestText);

    expect(manifest.name).toEqual(defaultOptions.project);
    expect(manifest.short_name).toEqual(defaultOptions.project);
  });

  it('should update the index file', async () => {
    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const content = tree.readContent('projects/bar/src/index.html');

    expect(content).toMatch(/<link rel="manifest" href="manifest.webmanifest">/);
    expect(content).toMatch(/<meta name="theme-color" content="#1976d2">/);
    expect(content).toMatch(
      /<noscript>Please enable JavaScript to continue using this application.<\/noscript>/,
    );
  });

  it('should not add noscript element to the index file if already present', async () => {
    let index = appTree.readContent('projects/bar/src/index.html');
    index = index.replace('</body>', '<noscript>NO JAVASCRIPT</noscript></body>');
    appTree.overwrite('projects/bar/src/index.html', index);

    const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const content = tree.readContent('projects/bar/src/index.html');

    expect(content).toMatch(/<link rel="manifest" href="manifest.webmanifest">/);
    expect(content).toMatch(/<meta name="theme-color" content="#1976d2">/);
    expect(content).not.toMatch(
      /<noscript>Please enable JavaScript to continue using this application.<\/noscript>/,
    );
    expect(content).toMatch(/<noscript>NO JAVASCRIPT<\/noscript>/);
  });

  describe('Legacy browser builder', () => {
    function convertBuilderToLegacyBrowser(): void {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      const build = config.projects.bar.architect.build;

      build.builder = '@angular-devkit/build-angular:browser';
      build.options = {
        ...build.options,
        main: build.options.browser,
        browser: undefined,
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };

      appTree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));
    }

    beforeEach(() => {
      convertBuilderToLegacyBrowser();
    });

    it('should run the service worker schematic', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
      const configText = tree.readContent('/angular.json');
      const config = JSON.parse(configText);
      const swFlag = config.projects.bar.architect.build.options.serviceWorker;

      expect(swFlag).toBeTrue();
    });
  });
});
