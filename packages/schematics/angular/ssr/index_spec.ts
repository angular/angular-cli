/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { join } from 'node:path';
import { Schema as ServerOptions } from './schema';

describe('SSR Schematic', () => {
  const defaultOptions: ServerOptions = {
    project: 'test-app',
  };

  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
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
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const filePath = '/package.json';
      const contents = tree.readContent(filePath);
      expect(contents).toContain('express');
    });

    it('should install npm dependencies', async () => {
      await schematicRunner.runSchematic('ssr', defaultOptions, appTree);
      expect(schematicRunner.tasks.length).toBe(1);
      expect(schematicRunner.tasks[0].name).toBe('node-package');
      expect((schematicRunner.tasks[0].options as { command: string }).command).toBe('install');
    });

    it(`should update 'tsconfig.app.json' files with Express main file`, async () => {
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);
      const { files } = tree.readJson('/projects/test-app/tsconfig.app.json') as {
        files: string[];
      };

      expect(files).toEqual(['src/main.ts', 'src/main.server.ts', 'src/server.ts']);
    });
  });

  describe('standalone application', () => {
    const originalTty = process.env['NG_FORCE_TTY'];

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

    afterEach(() => {
      process.env['NG_FORCE_TTY'] = originalTty;
      delete process.versions.webcontainer;
    });

    it('should add script section in package.json', async () => {
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);
      const { scripts } = tree.readJson('/package.json') as { scripts: Record<string, string> };

      expect(scripts['serve:ssr:test-app']).toBe(`node dist/test-app/server/server.mjs`);
    });

    it('works when using a custom "outputPath.browser" and "outputPath.server" values', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = appTree.readJson('/angular.json') as any;
      const build = config.projects['test-app'].architect.build;

      build.options.outputPath = {
        base: 'dist/test-app',
        browser: 'public',
        server: 'node-server',
      };

      appTree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const { scripts } = tree.readJson('/package.json') as { scripts: Record<string, string> };
      expect(scripts['serve:ssr:test-app']).toBe(`node dist/test-app/node-server/server.mjs`);

      const serverFileContent = tree.readContent('/projects/test-app/src/server.ts');
      expect(serverFileContent).toContain(`join(import.meta.dirname, '../public')`);
    });

    it(`removes "outputPath.browser" when it's an empty string`, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = appTree.readJson('/angular.json') as any;
      const build = config.projects['test-app'].architect.build;

      build.options.outputPath = {
        base: 'dist/test-app',
        browser: '',
        server: 'node-server',
      };

      appTree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const { scripts } = tree.readJson('/package.json') as { scripts: Record<string, string> };
      expect(scripts['serve:ssr:test-app']).toBe(`node dist/test-app/node-server/server.mjs`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedConfig = tree.readJson('/angular.json') as any;
      expect(updatedConfig.projects['test-app'].architect.build.options.outputPath).toEqual({
        base: 'dist/test-app',
        server: 'node-server',
      });
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
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const { files } = tree.readJson('/projects/test-app/tsconfig.server.json') as {
        files: string[];
      };

      expect(files).toEqual(['src/main.server.ts', 'src/server.ts']);
    });

    it(`should add export to main file in 'server.ts'`, async () => {
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const content = tree.readContent('/projects/test-app/src/server.ts');
      expect(content).toContain(`export default AppServerModule`);
    });

    it(`should add correct value to 'distFolder'`, async () => {
      const tree = await schematicRunner.runSchematic('ssr', defaultOptions, appTree);

      const content = tree.readContent('/projects/test-app/src/server.ts');
      expect(content).toContain(`const distFolder = join(process.cwd(), 'dist/test-app/browser');`);
    });
  });
});
