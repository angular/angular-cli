/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ConfigOptions, Tool as ConfigTool } from './schema';

describe('Ai Config Schematic', () => {
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
  function runConfigSchematic(tool: ConfigTool[]): Promise<UnitTestTree> {
    return schematicRunner.runSchematic<ConfigOptions>('ai-config', { tool }, workspaceTree);
  }

  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create an AGENTS.md file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Agents]);
    expect(tree.exists('AGENTS.md')).toBeTruthy();
  });

  it('should create a GEMINI.MD file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Gemini]);
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
  });

  it('should create a copilot-instructions.md file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Copilot]);
    expect(tree.exists('.github/copilot-instructions.md')).toBeTruthy();
  });

  it('should create a cursor file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Cursor]);
    expect(tree.exists('.cursor/rules/cursor.mdc')).toBeTruthy();
  });

  it('should create a windsurf file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Windsurf]);
    expect(tree.exists('.windsurf/rules/guidelines.md')).toBeTruthy();
  });

  it('should create a claude file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Claude]);
    expect(tree.exists('.claude/CLAUDE.md')).toBeTruthy();
  });

  it('should create a jetbrains file', async () => {
    const tree = await runConfigSchematic([ConfigTool.Jetbrains]);
    expect(tree.exists('.junie/guidelines.md')).toBeTruthy();
  });

  it('should create multiple files when multiple tools are selected', async () => {
    const tree = await runConfigSchematic([
      ConfigTool.Gemini,
      ConfigTool.Copilot,
      ConfigTool.Cursor,
    ]);
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
    expect(tree.exists('.github/copilot-instructions.md')).toBeTruthy();
    expect(tree.exists('.cursor/rules/cursor.mdc')).toBeTruthy();
  });

  it('should not create any files if None is selected', async () => {
    const filesCount = workspaceTree.files.length;
    const tree = await runConfigSchematic([ConfigTool.None]);
    expect(tree.files.length).toBe(filesCount);
  });

  it('should create for tool if None and Gemini are selected', async () => {
    const tree = await runConfigSchematic([ConfigTool.Gemini, ConfigTool.None]);
    expect(tree.exists('.gemini/GEMINI.md')).toBeTruthy();
  });
});
