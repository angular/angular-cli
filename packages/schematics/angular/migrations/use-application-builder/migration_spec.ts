/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '/project/app',
        sourceRoot: 'src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.Browser,
            options: {
              tsConfig: 'src/tsconfig.app.json',
              main: 'src/main.ts',
              polyfills: 'src/polyfills.ts',
              outputPath: 'dist/project',
              resourcesOutputPath: '/resources',
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
  tree.create('/tsconfig.json', JSON.stringify({}, undefined, 2));
  tree.create('/package.json', JSON.stringify({}, undefined, 2));
}

function addWorkspaceTarget(tree: UnitTestTree, targetName: string, targetEntry: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceContent = tree.readJson('/angular.json') as Record<string, any>;

  workspaceContent['projects']['app']['architect'][targetName] = targetEntry;

  tree.overwrite('/angular.json', JSON.stringify(workspaceContent));
}

describe(`Migration to use the application builder`, () => {
  const schematicName = 'use-application-builder';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should replace 'outputPath' to string if 'resourcesOutputPath' is set to 'media'`, async () => {
    // Replace resourcesOutputPath
    tree.overwrite('angular.json', tree.readContent('angular.json').replace('/resources', 'media'));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath, resourcesOutputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
    });
    expect(resourcesOutputPath).toBeUndefined();
  });

  it(`should set 'outputPath.media' if 'resourcesOutputPath' is set and is not 'media'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath, resourcesOutputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
      media: 'resources',
    });
    expect(resourcesOutputPath).toBeUndefined();
  });

  it(`should remove 'browser' portion from 'outputPath'`, async () => {
    // Replace outputPath
    tree.overwrite(
      'angular.json',
      tree.readContent('angular.json').replace('dist/project/', 'dist/project/browser/'),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { outputPath } = app.architect['build'].options;
    expect(outputPath).toEqual({
      base: 'dist/project',
      media: 'resources',
    });
  });

  it(`should remove 'builderMode' from karma options`, async () => {
    addWorkspaceTarget(tree, 'test', {
      'builder': Builders.Karma,
      'options': {
        'builderMode': 'detect',
        'polyfills': ['zone.js', 'zone.js/testing'],
        'tsConfig': 'projects/app-a/tsconfig.spec.json',
      },
    });

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { builderMode } = app.architect['test'].options;
    expect(builderMode).toBeUndefined();
  });

  it(`should update file for 'karmaConfig' karma option (no require trailing comma)`, async () => {
    addWorkspaceTarget(tree, 'test', {
      'builder': Builders.Karma,
      'options': {
        'karmaConfig': './karma.conf.js',
        'polyfills': ['zone.js', 'zone.js/testing'],
        'tsConfig': 'projects/app-a/tsconfig.spec.json',
      },
    });
    tree.create(
      './karma.conf.js',
      `
        module.exports = function (config) {
          config.set({
            basePath: '',
            frameworks: ['jasmine', '@angular-devkit/build-angular'],
            plugins: [
              require('karma-jasmine'),
              require('karma-chrome-launcher'),
              require('karma-jasmine-html-reporter'),
              require('karma-coverage'),
              require('@angular-devkit/build-angular/plugins/karma')
            ]
          });
        };`,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { karmaConfig } = app.architect['test'].options;
    expect(karmaConfig).toBe('./karma.conf.js');

    const karmaConfigText = newTree.readText('./karma.conf.js');
    expect(karmaConfigText).not.toContain(`require('@angular-devkit/build-angular/plugins/karma')`);
  });

  it(`should update file for 'karmaConfig' karma option (require trailing comma)`, async () => {
    addWorkspaceTarget(tree, 'test', {
      'builder': Builders.Karma,
      'options': {
        'karmaConfig': './karma.conf.js',
        'polyfills': ['zone.js', 'zone.js/testing'],
        'tsConfig': 'projects/app-a/tsconfig.spec.json',
      },
    });
    tree.create(
      './karma.conf.js',
      `
        module.exports = function (config) {
          config.set({
            basePath: '',
            frameworks: ['jasmine', '@angular-devkit/build-angular'],
            plugins: [
              require('karma-jasmine'),
              require('karma-chrome-launcher'),
              require('karma-jasmine-html-reporter'),
              require('karma-coverage'),
              require('@angular-devkit/build-angular/plugins/karma'),
            ]
          });
        };`,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { karmaConfig } = app.architect['test'].options;
    expect(karmaConfig).toBe('./karma.conf.js');

    const karmaConfigText = newTree.readText('./karma.conf.js');
    expect(karmaConfigText).not.toContain(`require('@angular-devkit/build-angular/plugins/karma')`);
  });

  it(`should ignore missing file for 'karmaConfig' karma option`, async () => {
    addWorkspaceTarget(tree, 'test', {
      'builder': Builders.Karma,
      'options': {
        'karmaConfig': './karma.conf.js',
        'polyfills': ['zone.js', 'zone.js/testing'],
        'tsConfig': 'projects/app-a/tsconfig.spec.json',
      },
    });

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { karmaConfig } = app.architect['test'].options;
    expect(karmaConfig).toBe('./karma.conf.js');
  });

  it('should remove tilde prefix from CSS @import specifiers', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.css',
      '@import "~@angular/material";\n@import "./abc.css"\n',
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.css');

    expect(content).toEqual('@import "@angular/material";\n@import "./abc.css"\n');
  });

  it('should remove caret prefix from CSS @import specifiers and as external dependency', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.css',
      '@import "^@angular/material";\n@import "./abc.css"\n',
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.css');

    expect(content).toEqual('@import "@angular/material";\n@import "./abc.css"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { externalDependencies } = app.architect['build'].options;
    expect(externalDependencies).toEqual(['@angular/material']);
  });

  it('should remove tilde prefix from SCSS @import specifiers', async () => {
    // Replace outputPath
    tree.create('/project/app/src/styles.scss', '@import "~@angular/material";\n@import "./abc"\n');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@import "@angular/material";\n@import "./abc"\n');
  });

  it('should remove tilde prefix from SCSS @use specifiers', async () => {
    // Replace outputPath
    tree.create('/project/app/src/styles.scss', '@use "~@angular/material";\n@import "./abc"\n');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@import "./abc"\n');
  });

  it('should remove caret prefix from SCSS @import specifiers and as external dependency', async () => {
    // Replace outputPath
    tree.create('/project/app/src/styles.scss', '@import "^@angular/material";\n@import "./abc"\n');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@import "@angular/material";\n@import "./abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { externalDependencies } = app.architect['build'].options;
    expect(externalDependencies).toEqual(['@angular/material']);
  });

  it('should remove caret prefix from SCSS @use specifiers and as external dependency', async () => {
    // Replace outputPath
    tree.create('/project/app/src/styles.scss', '@use "^@angular/material";\n@import "./abc"\n');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@import "./abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { externalDependencies } = app.architect['build'].options;
    expect(externalDependencies).toEqual(['@angular/material']);
  });

  it('should add SCSS workspace include path for root referenced @import specifiers', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.scss',
      '@use "@angular/material";\n@import "some/path/abc"\n',
    );
    tree.create('/some/path/abc.scss', '');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@import "some/path/abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { stylePreprocessorOptions } = app.architect['build'].options;
    expect(stylePreprocessorOptions).toEqual({ includePaths: ['.'] });
  });

  it('should add SCSS workspace include path for root referenced @use specifiers', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.scss',
      '@use "@angular/material";\n@use "some/path/abc"\n',
    );
    tree.create('/some/path/abc.scss', '');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@use "some/path/abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { stylePreprocessorOptions } = app.architect['build'].options;
    expect(stylePreprocessorOptions).toEqual({ includePaths: ['.'] });
  });

  it('should not add SCSS workspace include path for root referenced @import specifiers with ".import" local file', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.scss',
      '@use "@angular/material";\n@import "some/path/abc"\n',
    );
    tree.create('/some/path/abc.scss', '');
    tree.create('/project/app/src/some/path/abc.import.scss', '');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@import "some/path/abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { stylePreprocessorOptions } = app.architect['build'].options;
    expect(stylePreprocessorOptions).toBeUndefined();
  });

  it('should add SCSS workspace include path for root referenced @use specifiers with ".import" local file', async () => {
    // Replace outputPath
    tree.create(
      '/project/app/src/styles.scss',
      '@use "@angular/material";\n@use "some/path/abc"\n',
    );
    tree.create('/some/path/abc.scss', '');
    tree.create('/project/app/src/some/path/abc.import.scss', '');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/project/app/src/styles.scss');

    expect(content).toEqual('@use "@angular/material";\n@use "some/path/abc"\n');
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));

    const { stylePreprocessorOptions } = app.architect['build'].options;
    expect(stylePreprocessorOptions).toEqual({ includePaths: ['.'] });
  });

  it('should add "less" dependency when converting to "@angular/build" and a ".less" file is present', async () => {
    tree.create('/project/app/src/styles.less', '');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['less']).toBeDefined();
  });

  it('should not add "less" dependency when converting to "@angular/build" and a ".less" file is not present', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['less']).toBeUndefined();
  });

  it('should add "postcss" dependency when converting to "@angular/build" and postcss.config.json is present', async () => {
    tree.create('postcss.config.json', '{}');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['postcss']).toBeDefined();
  });

  it('should add "postcss" dependency when converting to "@angular/build" and .postcssrc.json is present', async () => {
    tree.create('.postcssrc.json', '{}');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['postcss']).toBeDefined();
  });

  it('should add "postcss" dependency when converting to "@angular/build" and .postcssrc.json is present in project', async () => {
    tree.create('/project/app/.postcssrc.json', '{}');

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['postcss']).toBeDefined();
  });

  it('should not add "postcss" dependency when converting to "@angular/build" and a Postcss configuration is not present', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);

    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));

    expect(devDependencies['postcss']).toBeUndefined();
  });
});
