/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { Schema as ApplicationOptions, Style } from '../application/schema';
import { CompilerOptions } from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as UniversalOptions } from './schema';

describe('Universal Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: UniversalOptions = {
    project: 'bar',
  };
  const workspaceUniversalOptions: UniversalOptions = {
    project: 'workspace',
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

  const initialWorkspaceAppOptions: ApplicationOptions = {
    name: 'workspace',
    projectRoot: '',
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
    appTree = await schematicRunner.runSchematic(
      'application',
      initialWorkspaceAppOptions,
      appTree,
    );
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a root module file', async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.module.server.ts';
    expect(tree.exists(filePath)).toEqual(true);
  });

  it('should create a main file', async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/src/main.server.ts';
    expect(tree.exists(filePath)).toEqual(true);
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/export { AppServerModule } from '\.\/app\/app\.module\.server'/);
  });

  it('should create a tsconfig file for the workspace project', async () => {
    const tree = await schematicRunner.runSchematic(
      'universal',
      workspaceUniversalOptions,
      appTree,
    );
    const filePath = '/tsconfig.server.json';
    expect(tree.exists(filePath)).toEqual(true);
    const contents = parseJson(tree.readContent(filePath).toString());
    expect(contents).toEqual({
      extends: './tsconfig.app.json',
      compilerOptions: {
        outDir: './out-tsc/server',
        types: ['node'],
      },
      files: ['src/main.server.ts'],
    });
    const angularConfig = JSON.parse(tree.readContent('angular.json'));
    expect(angularConfig.projects.workspace.architect.server.options.tsConfig).toEqual(
      'tsconfig.server.json',
    );
  });

  it('should create a tsconfig file for a generated application', async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/tsconfig.server.json';
    expect(tree.exists(filePath)).toEqual(true);
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

  it('should add dependency: @angular/platform-server', async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/package.json';
    const contents = tree.readContent(filePath);
    expect(contents).toMatch(/"@angular\/platform-server": "/);
  });

  it('should update workspace with a server target', async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
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
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/angular.json';
    const contents = tree.readContent(filePath);
    const config = JSON.parse(contents.toString());
    const targets = config.projects.bar.architect;
    expect(targets.build.options.outputPath).toEqual('dist/bar/browser');
  });

  it('should install npm dependencies', async () => {
    await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    expect(schematicRunner.tasks.length).toBe(1);
    expect(schematicRunner.tasks[0].name).toBe('node-package');
    expect((schematicRunner.tasks[0].options as { command: string }).command).toBe('install');
  });

  it(`should work when 'tsconfig.app.json' has comments`, async () => {
    const appTsConfigPath = '/projects/bar/tsconfig.app.json';
    const appTsConfigContent = appTree.readContent(appTsConfigPath);
    appTree.overwrite(appTsConfigPath, '// comment in json file\n' + appTsConfigContent);

    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const filePath = '/projects/bar/tsconfig.server.json';
    expect(tree.exists(filePath)).toEqual(true);
  });

  it(`should not add import to '@angular/localize' as type in 'tsconfig.server.json' when it's not a dependency`, async () => {
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
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
    const tree = await schematicRunner.runSchematic('universal', defaultOptions, appTree);
    const { compilerOptions } = tree.readJson('/projects/bar/tsconfig.server.json') as {
      compilerOptions: CompilerOptions;
    };
    expect(compilerOptions.types).toContain('@angular/localize');
  });

  describe('standalone application', () => {
    let standaloneAppOptions;
    let defaultStandaloneOptions: UniversalOptions;
    beforeEach(async () => {
      const standaloneAppName = 'baz';
      standaloneAppOptions = {
        ...appOptions,
        name: standaloneAppName,
        standalone: true,
      };
      defaultStandaloneOptions = {
        project: standaloneAppName,
      };
      appTree = await schematicRunner.runSchematic('application', standaloneAppOptions, appTree);
    });

    it('should create not root module file', async () => {
      const tree = await schematicRunner.runSchematic(
        'universal',
        defaultStandaloneOptions,
        appTree,
      );
      const filePath = '/projects/baz/src/app/app.module.server.ts';
      expect(tree.exists(filePath)).toEqual(false);
    });

    it('should create a main file', async () => {
      const tree = await schematicRunner.runSchematic(
        'universal',
        defaultStandaloneOptions,
        appTree,
      );
      const filePath = '/projects/baz/src/main.server.ts';
      expect(tree.exists(filePath)).toEqual(true);
      const contents = tree.readContent(filePath);
      expect(contents).toContain(`bootstrapApplication(AppComponent, config)`);
    });

    it('should create server app config file', async () => {
      const tree = await schematicRunner.runSchematic(
        'universal',
        defaultStandaloneOptions,
        appTree,
      );
      const filePath = '/projects/baz/src/app/app.config.server.ts';
      expect(tree.exists(filePath)).toEqual(true);
      const contents = tree.readContent(filePath);
      expect(contents).toContain(`const serverConfig: ApplicationConfig = {`);
    });
  });
});
