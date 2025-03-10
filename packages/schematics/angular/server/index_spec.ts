/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { Schema as ApplicationOptions, Style } from '../application/schema';
import { CompilerOptions } from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { Builders } from '../utility/workspace-models';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ServerOptions } from './schema';

describe('Server Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ServerOptions = {
    project: 'bar',
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
    routing: false,
    style: Style.Css,
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  describe('non standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic(
        'application',
        { ...appOptions, standalone: false },
        appTree,
      );
    });

    it('should create a root module file', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      expect(tree.exists(filePath)).toBeTrue();
    });

    it('should create a main file', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/src/main.server.ts';
      expect(tree.exists(filePath)).toBeTrue();
      const contents = tree.readContent(filePath);
      expect(contents).toContain(
        `export { AppServerModule as default } from './app/app.module.server';`,
      );
    });

    it('should add dependency: @angular/platform-server', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/package.json';
      const contents = tree.readContent(filePath);
      expect(contents).toMatch(/"@angular\/platform-server": "/);
    });

    it('should install npm dependencies', async () => {
      await schematicRunner.runSchematic('server', defaultOptions, appTree);
      expect(schematicRunner.tasks.length).toBe(1);
      expect(schematicRunner.tasks[0].name).toBe('node-package');
      expect((schematicRunner.tasks[0].options as { command: string }).command).toBe('install');
    });

    it('should update tsconfig.app.json', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/tsconfig.app.json';
      const contents = parseJson(tree.readContent(filePath).toString());
      expect(contents.compilerOptions.types).toEqual(['node']);
      expect(contents.files).toEqual(['src/main.ts', 'src/main.server.ts']);
    });

    it(`should add 'provideClientHydration' to the providers list`, async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const contents = tree.readContent('/projects/bar/src/app/app.module.ts');
      expect(contents).toContain(`provideClientHydration(withEventReplay())`);
    });
  });

  describe('standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
    });

    it('should create not root module file', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      expect(tree.exists(filePath)).toEqual(false);
    });

    it('should update workspace and add the server option', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/angular.json';
      const contents = tree.readContent(filePath);
      const config = JSON.parse(contents.toString());
      const targets = config.projects.bar.architect;
      expect(targets.build.options.server).toEqual('projects/bar/src/main.server.ts');
    });

    it('should create a main file', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/src/main.server.ts';
      expect(tree.exists(filePath)).toBeTrue();
      const contents = tree.readContent(filePath);
      expect(contents).toContain(`bootstrapApplication(App, config)`);
    });

    it('should create server app config file', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.config.server.ts';
      expect(tree.exists(filePath)).toBeTrue();
      const contents = tree.readContent(filePath);
      expect(contents).toContain(`const serverConfig: ApplicationConfig = {`);
    });

    it(`should add 'provideClientHydration' to the providers list`, async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const contents = tree.readContent('/projects/bar/src/app/app.config.ts');
      expect(contents).toContain(`provideClientHydration(withEventReplay())`);
    });
  });

  describe('Legacy browser builder', () => {
    function convertBuilderToLegacyBrowser(): void {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      const build = config.projects.bar.architect.build;

      build.builder = Builders.Browser;
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
      appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
      convertBuilderToLegacyBrowser();
    });

    it(`should not add import to '@angular/localize' as type in 'tsconfig.server.json' when it's not a dependency`, async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const { compilerOptions } = tree.readJson('/projects/bar/tsconfig.server.json') as {
        compilerOptions: CompilerOptions;
      };
      expect(compilerOptions.types).not.toContain('@angular/localize');
    });

    it(`should add import to '@angular/localize' as type in 'tsconfig.server.json' when it's a dependency`, async () => {
      addPackageJsonDependency(appTree, {
        name: '@angular/localize',
        type: NodeDependencyType.Default,
        version: 'latest',
      });
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const { compilerOptions } = tree.readJson('/projects/bar/tsconfig.server.json') as {
        compilerOptions: CompilerOptions;
      };
      expect(compilerOptions.types).toContain('@angular/localize');
    });

    it('should update workspace with a server target', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/angular.json';
      const contents = tree.readContent(filePath);
      const config = JSON.parse(contents.toString());
      const targets = config.projects.bar.architect;
      expect(targets.server).toBeDefined();
      expect(targets.server.builder).toBeDefined();
      const opts = targets.server.options;
      expect(opts.outputPath).toEqual('dist/bar/server');
      expect(opts.main).toEqual('projects/bar/src/main.server.ts');
      expect(opts.tsConfig).toEqual('projects/bar/tsconfig.server.json');
    });

    it('should update workspace with a build target outputPath', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/angular.json';
      const contents = tree.readContent(filePath);
      const config = JSON.parse(contents.toString());
      const targets = config.projects.bar.architect;
      expect(targets.build.options.outputPath).toEqual('dist/bar/browser');
    });

    it(`should work when 'tsconfig.app.json' has comments`, async () => {
      const appTsConfigPath = '/projects/bar/tsconfig.app.json';
      const appTsConfigContent = appTree.readContent(appTsConfigPath);
      appTree.overwrite(appTsConfigPath, '// comment in json file\n' + appTsConfigContent);

      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/tsconfig.server.json';
      expect(tree.exists(filePath)).toBeTrue();
    });

    it('should create a tsconfig file for a generated application', async () => {
      const tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      const filePath = '/projects/bar/tsconfig.server.json';
      expect(tree.exists(filePath)).toBeTrue();
      const contents = parseJson(tree.readContent(filePath).toString());
      expect(contents).toEqual({
        extends: './tsconfig.app.json',
        compilerOptions: {
          outDir: '../../out-tsc/server',
          types: ['node'],
        },
        files: ['src/main.server.ts'],
      });
      const angularConfig = JSON.parse(tree.readContent('angular.json'));
      expect(angularConfig.projects.bar.architect.server.options.tsConfig).toEqual(
        'projects/bar/tsconfig.server.json',
      );
    });
  });
});
