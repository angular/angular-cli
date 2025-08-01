/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ConfigOptions, Tool as ConfigTool, Type as ConfigType } from './schema';

describe('Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '15.0.0',
  };

  const defaultAppOptions: ApplicationOptions = {
    name: 'foo',
    inlineStyle: true,
    inlineTemplate: true,
    routing: false,
    skipPackageJson: false,
  };

  let applicationTree: UnitTestTree;
  function runConfigSchematic(type: ConfigType, tool?: ConfigTool): Promise<UnitTestTree>;
  function runConfigSchematic(type: ConfigType.Ai, tool: ConfigTool): Promise<UnitTestTree>;
  function runConfigSchematic(type: ConfigType, tool?: ConfigTool): Promise<UnitTestTree> {
    return schematicRunner.runSchematic<ConfigOptions>(
      'config',
      {
        project: 'foo',
        type,
        tool,
      },
      applicationTree,
    );
  }

  beforeEach(async () => {
    const workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    applicationTree = await schematicRunner.runSchematic(
      'application',
      defaultAppOptions,
      workspaceTree,
    );
  });

  describe(`when 'type' is 'karma'`, () => {
    it('should create a karma.conf.js file', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      expect(tree.exists('projects/foo/karma.conf.js')).toBeTrue();
    });

    it('should not include devkit karma plugin by default', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).not.toContain(`'@angular-devkit/build-angular'`);
    });

    it('should include devkit karma plugin when angular-devkit/build-angular:karma is used', async () => {
      applicationTree.overwrite(
        'angular.json',
        applicationTree
          .readText('angular.json')
          .replace('@angular/build:karma', '@angular-devkit/build-angular:karma'),
      );
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).toContain(`'@angular-devkit/build-angular'`);
    });

    it('should set the right coverage folder', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).toContain(`dir: require('path').join(__dirname, '../../coverage/foo')`);
    });

    it(`should set 'karmaConfig' in test builder`, async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      const { karmaConfig } = prj.architect.test.options;
      expect(karmaConfig).toBe('projects/foo/karma.conf.js');
    });
  });

  describe(`when 'type' is 'browserslist'`, () => {
    it('should create a .browserslistrc file', async () => {
      const tree = await runConfigSchematic(ConfigType.Browserslist);
      expect(tree.readContent('projects/foo/.browserslistrc')).toContain('Chrome >=');
    });
  });

  describe(`when 'type' is 'ai'`, () => {
    it('should create a GEMINI.MD file', async () => {
      const tree = await runConfigSchematic(ConfigType.Ai, ConfigTool.Gemini);
      expect(tree.readContent('.gemini/GEMINI.md')).toMatch(/^You are an expert in TypeScript/);
    });

    it('should create a copilot-instructions.md file', async () => {
      const tree = await runConfigSchematic(ConfigType.Ai, ConfigTool.Copilot);
      expect(tree.readContent('.github/copilot-instructions.md')).toContain(
        'You are an expert in TypeScript',
      );
    });

    it('should create a cursor file', async () => {
      const tree = await runConfigSchematic(ConfigType.Ai, ConfigTool.Cursor);
      const cursorFile = tree.readContent('.cursor/rules/cursor.mdc');
      expect(cursorFile).toContain('You are an expert in TypeScript');
      expect(cursorFile).toContain('context: true');
      expect(cursorFile).toContain('---\n\nYou are an expert in TypeScript');
    });

    it('should create a windsurf file', async () => {
      const tree = await runConfigSchematic(ConfigType.Ai, ConfigTool.Windsurf);
      expect(tree.readContent('.windsurf/rules/guidelines.md')).toContain(
        'You are an expert in TypeScript',
      );
    });

    it('should create a claude file', async () => {
      const tree = await runConfigSchematic(ConfigType.Ai, ConfigTool.Claude);
      expect(tree.readContent('.claude/CLAUDE.md')).toContain('You are an expert in TypeScript');
    });
  });
});
