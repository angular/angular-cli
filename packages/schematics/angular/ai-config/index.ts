/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, chain, noop, strings } from '@angular-devkit/schematics';
import { addBestPracticesMarkdown, addJsonMcpConfig, addTomlMcpConfig } from './file_utils';
import { Schema as ConfigOptions, Tool } from './schema';
import { ContextFileInfo, ContextFileType, FileConfigurationHandlerOptions } from './types';

const AGENTS_MD_CFG: ContextFileInfo = {
  type: ContextFileType.BestPracticesMd,
  name: 'AGENTS.md',
  directory: '.',
};

const AI_TOOLS: { [key in Exclude<Tool, Tool.None>]: ContextFileInfo[] } = {
  ['claude-code']: [
    AGENTS_MD_CFG,
    {
      type: ContextFileType.McpConfig,
      name: '.mcp.json',
      directory: '.',
    },
  ],
  cursor: [
    AGENTS_MD_CFG,
    {
      type: ContextFileType.McpConfig,
      name: 'mcp.json',
      directory: '.cursor',
    },
  ],
  ['gemini-cli']: [
    {
      type: ContextFileType.BestPracticesMd,
      name: 'GEMINI.md',
      directory: '.gemini',
    },
    {
      type: ContextFileType.McpConfig,
      name: 'settings.json',
      directory: '.gemini',
    },
  ],
  ['open-ai-codex']: [
    AGENTS_MD_CFG,
    {
      type: ContextFileType.McpConfig,
      name: 'config.toml',
      directory: '.codex',
    },
  ],
  vscode: [
    AGENTS_MD_CFG,
    {
      type: ContextFileType.McpConfig,
      name: 'mcp.json',
      directory: '.vscode',
    },
  ],
};

export default function ({ tool }: ConfigOptions): Rule {
  return (tree, context) => {
    if (!tool) {
      return noop();
    }

    const rules = tool
      .filter((tool) => tool !== Tool.None)
      .flatMap((selectedTool) =>
        AI_TOOLS[selectedTool].map((fileInfo) => {
          const fileCfgOpts: FileConfigurationHandlerOptions = {
            tree,
            context,
            fileInfo,
            tool: selectedTool,
          };

          switch (fileInfo.type) {
            case ContextFileType.BestPracticesMd:
              return addBestPracticesMarkdown(fileCfgOpts);
            case ContextFileType.McpConfig:
              switch (selectedTool) {
                case Tool.ClaudeCode:
                case Tool.Cursor:
                case Tool.GeminiCli:
                  return addJsonMcpConfig(fileCfgOpts, 'mcpServers');
                case Tool.OpenAiCodex:
                  return addTomlMcpConfig(fileCfgOpts);
                case Tool.Vscode:
                  return addJsonMcpConfig(fileCfgOpts, 'servers');
                default:
                  throw new Error(
                    `Unsupported '${strings.classify(selectedTool)}' MCP server configuraiton.`,
                  );
              }
          }
        }),
      );

    return chain(rules);
  };
}
