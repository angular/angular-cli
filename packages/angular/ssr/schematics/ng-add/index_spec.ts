/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { join } from 'node:path';
import { Schema as ServerOptions } from './schema';

describe('SSR Schematic', () => {
  const defaultOptions: ServerOptions = {
    project: 'test-app',
  };

  const schematicRunner = new SchematicTestRunner(
    '@angular/ssr',
    require.resolve(join(__dirname, '../collection.json')),
  );

  let appTree: UnitTestTree;

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions,
    );
  });

  describe('non standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        {
          name: 'test-app',
          inlineStyle: false,
          inlineTemplate: false,
          routing: false,
          style: 'css',
          skipTests: false,
          standalone: false,
        },
        appTree,
      );
    });

    it('should add dependency: express', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const filePath = '/package.json';
      const contents = tree.readContent(filePath);
      expect(contents).toContain('express');
    });

    it('should install npm dependencies', async () => {
      await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
      expect(schematicRunner.tasks.length).toBe(1);
      expect(schematicRunner.tasks[0].name).toBe('node-package');
      expect((schematicRunner.tasks[0].options as { command: string }).command).toBe('install');
    });

    it(`should update 'tsconfig.app.json' files with Express main file`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
      const { files } = tree.readJson('/projects/test-app/tsconfig.app.json') as {
        files: string[];
      };

      expect(files).toEqual(['src/main.ts', 'src/main.server.ts', 'server.ts']);
    });

    it(`should import 'AppServerModule' from 'main.server.ts'`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const filePath = '/projects/test-app/server.ts';
      const content = tree.readContent(filePath);
      expect(content).toContain(`import AppServerModule from './src/main.server';`);
    });

    it(`should pass 'AppServerModule' in the bootstrap parameter.`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const filePath = '/projects/test-app/server.ts';
      const content = tree.readContent(filePath);
      expect(tags.oneLine`${content}`).toContain(tags.oneLine`
      .render({
        bootstrap: AppServerModule,
    `);
    });
  });

  describe('standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        {
          name: 'test-app',
          inlineStyle: false,
          inlineTemplate: false,
          routing: false,
          style: 'css',
          skipTests: false,
          standalone: true,
        },
        appTree,
      );
    });

    it(`should add default import to 'main.server.ts'`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const filePath = '/projects/test-app/server.ts';
      const content = tree.readContent(filePath);
      expect(content).toContain(`import bootstrap from './src/main.server';`);
    });

    it(`should pass 'AppServerModule' in the bootstrap parameter.`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const filePath = '/projects/test-app/server.ts';
      const content = tree.readContent(filePath);
      expect(tags.oneLine`${content}`).toContain(tags.oneLine`
        .render({
          bootstrap,
      `);
    });
  });

  describe('Legacy browser builder', () => {
    function convertBuilderToLegacyBrowser(): void {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      const build = config.projects['test-app'].architect.build;

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

    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        {
          name: 'test-app',
          inlineStyle: false,
          inlineTemplate: false,
          routing: false,
          style: 'css',
          skipTests: false,
          standalone: false,
        },
        appTree,
      );

      convertBuilderToLegacyBrowser();
    });

    it(`should update 'tsconfig.server.json' files with Express main file`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const { files } = tree.readJson('/projects/test-app/tsconfig.server.json') as {
        files: string[];
      };

      expect(files).toEqual(['src/main.server.ts', 'server.ts']);
    });

    it(`should add export to main file in 'server.ts'`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const content = tree.readContent('/projects/test-app/server.ts');
      expect(content).toContain(`export default AppServerModule`);
    });

    it(`should add correct value to 'distFolder'`, async () => {
      const tree = await schematicRunner.runSchematic('ng-add', defaultOptions, appTree);

      const content = tree.readContent('/projects/test-app/server.ts');
      expect(content).toContain(`const distFolder = join(process.cwd(), 'dist/test-app/browser');`);
    });
  });
});
