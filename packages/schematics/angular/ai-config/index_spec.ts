/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { getAngularSkillsInstallArguments } from './install-skills';
import { Schema as ConfigOptions, Tool as ConfigTool } from './schema';

describe('AI Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '15.0.0',
  };

  let workspaceTree: UnitTestTree;
  function runAiConfigSchematic(
    tool: ConfigTool[],
    options: Partial<ConfigOptions> = {},
  ): Promise<UnitTestTree> {
    return schematicRunner.runSchematic<ConfigOptions>(
      'ai-config',
      { tool, ...options },
      workspaceTree,
    );
  }

  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create a non-interactive skills command for each selected AI tool', () => {
    expect(
      getAngularSkillsInstallArguments(
        [
          ConfigTool.ClaudeCode,
          ConfigTool.Cursor,
          ConfigTool.GeminiCli,
          ConfigTool.OpenAiCodex,
          ConfigTool.Vscode,
        ],
        '^22.1.0-next.0',
      ),
    ).toEqual([
      '--yes',
      'skills',
      'add',
      'https://github.com/angular/skills/tree/22.1.x',
      '--skill',
      'angular-developer',
      '--skill',
      'angular-new-app',
      '--agent',
      'claude-code',
      '--agent',
      'cursor',
      '--agent',
      'gemini-cli',
      '--agent',
      'codex',
      '--agent',
      'github-copilot',
      '--copy',
      '--yes',
    ]);
  });

  it('should create Angular MCP server config and AGENTS.md for Claude Code', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.ClaudeCode]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
    expect(tree.exists('.mcp.json')).toBeTruthy();
  });

  it('should create Angular MCP server config and AGENTS.md for Cursor', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.Cursor]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
    expect(tree.exists('.cursor/mcp.json')).toBeTruthy();
  });

  it('should create Angular MCP server config and GEMINI.md for Gemini CLI', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.GeminiCli]);
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
    expect(tree.exists('.gemini/settings.json')).toBeTruthy();
  });

  it('should create Angular MCP server config and AGENTS.md for Open AI Codex', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.OpenAiCodex]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
    expect(tree.exists('.codex/config.toml')).toBeTruthy();
  });

  it('should create Angular MCP server config and AGENTS.md for VS Code', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.Vscode]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
    expect(tree.exists('.vscode/mcp.json')).toBeTruthy();
  });

  it('should create multiple files when multiple tools are selected', async () => {
    const tree = await runAiConfigSchematic([
      ConfigTool.GeminiCli,
      ConfigTool.Vscode,
      ConfigTool.Cursor,
    ]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
    expect(tree.exists('.gemini/settings.json')).toBeTruthy();
    expect(tree.exists('.vscode/mcp.json')).toBeTruthy();
    expect(tree.exists('.cursor/mcp.json')).toBeTruthy();
  });

  it('should not create any files if None is selected', async () => {
    const filesCount = workspaceTree.files.length;
    const tree = await runAiConfigSchematic([ConfigTool.None]);
    expect(tree.files.length).toBe(filesCount);
  });

  it('should create for tool if None and an AI host are selected', async () => {
    const tree = await runAiConfigSchematic([ConfigTool.GeminiCli, ConfigTool.None]);
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
    expect(tree.exists('.gemini/settings.json')).toBeTruthy();
  });

  it('should omit best practices creation, if the file already exists', async () => {
    const customContent = 'custom user content';
    workspaceTree.create('AGENTS.md', customContent);

    const messages: string[] = [];
    const loggerSubscription = schematicRunner.logger.subscribe((x) => messages.push(x.message));

    try {
      const tree = await runAiConfigSchematic([ConfigTool.ClaudeCode]);

      expect(tree.readContent('AGENTS.md')).toBe(customContent);
      expect(messages).toContain(
        `Skipping configuration file for 'ClaudeCode' at './AGENTS.md' because it already exists.\n` +
          'This is to prevent overwriting a potentially customized file. ' +
          'If you want to regenerate it with Angular recommended defaults, please delete the existing file and re-run the command.\n' +
          'You can review the latest recommendations at https://angular.dev/ai/develop-with-ai.\n',
      );
    } finally {
      loggerSubscription.unsubscribe();
    }
  });

  it('should schedule Angular skills installation when enabled', async () => {
    await runAiConfigSchematic([ConfigTool.ClaudeCode], { aiSkills: true });

    expect(schematicRunner.tasks.length).toBe(1);
    expect(schematicRunner.tasks[0]).toEqual({
      name: 'run-schematic',
      options: {
        collection: null,
        name: 'ai-config-install-skills',
        options: {
          tools: ['claude-code'],
        },
      },
    });
  });

  it('should not install Angular skills when the user declines', async () => {
    await runAiConfigSchematic([ConfigTool.ClaudeCode], { aiSkills: false });

    expect(schematicRunner.tasks).toEqual([]);
  });

  it('should not install Angular skills when no AI tool is selected', async () => {
    await runAiConfigSchematic([ConfigTool.None], { aiSkills: true });

    expect(schematicRunner.tasks).toEqual([]);
  });

  it('should update JSON MCP server config, if the file exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonConfig: Record<string, any> = {
      foo: 'bar',
      mcpServers: {
        'baz': {},
      },
    };
    workspaceTree.create('.mcp.json', JSON.stringify(jsonConfig));

    const tree = await runAiConfigSchematic([ConfigTool.ClaudeCode]);

    const modifiedConfig = structuredClone(jsonConfig);
    modifiedConfig.mcpServers = {
      ...modifiedConfig.mcpServers,
      ['angular-cli']: {
        command: 'npx',
        args: ['-y', '@angular/cli', 'mcp'],
      },
    };

    const actualConfig = parse(tree.readContent('.mcp.json'));

    expect(JSON.stringify(actualConfig, null, 2)).toBe(JSON.stringify(modifiedConfig, null, 2));
  });

  it('should update TOML MCP server config, if the file exists', async () => {
    const tomlConfig = '[foo]';
    workspaceTree.create('.codex/config.toml', tomlConfig);

    const tree = await runAiConfigSchematic([ConfigTool.OpenAiCodex]);

    let modifiedConfig = tomlConfig;
    modifiedConfig +=
      '\n\n[mcp_servers.angular-cli]\n' +
      'command = "npx"\n' +
      'args = ["-y", "@angular/cli", "mcp"]\n';

    expect(tree.readContent('.codex/config.toml')).toBe(modifiedConfig);
  });

  it('should omit TOML MCP server config update, if the config already exists', async () => {
    const tomlConfig = '[mcp_servers.angular-cli]';
    workspaceTree.create('.codex/config.toml', tomlConfig);

    const messages: string[] = [];
    const loggerSubscription = schematicRunner.logger.subscribe((x) => messages.push(x.message));

    try {
      const tree = await runAiConfigSchematic([ConfigTool.OpenAiCodex]);

      expect(tree.readContent('.codex/config.toml')).toBe(tomlConfig);
      expect(messages).toContain(
        `Skipping Angular MCP server configuration for 'OpenAiCodex'.\n` +
          `Configuration already exists in '.codex/config.toml'.\n`,
      );
    } finally {
      loggerSubscription.unsubscribe();
    }
  });
});
