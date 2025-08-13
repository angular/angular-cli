/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import type { AngularWorkspace } from '../../utilities/config';
import { VERSION } from '../../utilities/version';
import { registerInstructionsResource } from './resources/instructions';
import { BEST_PRACTICES_TOOL } from './tools/best-practices';
import { DOC_SEARCH_TOOL } from './tools/doc-search';
import { FIND_EXAMPLE_TOOL } from './tools/examples';
import { MODERNIZE_TOOL } from './tools/modernize';
import { LIST_PROJECTS_TOOL } from './tools/projects';
import { AnyMcpToolDeclaration, registerTools } from './tools/tool-registry';

/**
 * The set of tools that are enabled by default for the MCP server.
 * These tools are considered stable and suitable for general use.
 */
const STABLE_TOOLS = [BEST_PRACTICES_TOOL, DOC_SEARCH_TOOL, LIST_PROJECTS_TOOL] as const;

/**
 * The set of tools that are available but not enabled by default.
 * These tools are considered experimental and may have limitations.
 */
export const EXPERIMENTAL_TOOLS = [FIND_EXAMPLE_TOOL, MODERNIZE_TOOL] as const;

export async function createMcpServer(
  options: {
    workspace?: AngularWorkspace;
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
  },
  logger: { warn(text: string): void },
): Promise<McpServer> {
  const server = new McpServer(
    {
      name: 'angular-cli-server',
      version: VERSION.full,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        logging: {},
      },
      instructions:
        'For Angular development, this server provides tools to adhere to best practices, search documentation, and find code examples. ' +
        'When writing or modifying Angular code, use the MCP server and its tools instead of direct shell commands where possible.',
    },
  );

  registerInstructionsResource(server);

  const toolDeclarations = assembleToolDeclarations(STABLE_TOOLS, EXPERIMENTAL_TOOLS, {
    ...options,
    logger,
  });

  await registerTools(
    server,
    {
      workspace: options.workspace,
      logger,
      exampleDatabasePath: path.join(__dirname, '../../../lib/code-examples.db'),
    },
    toolDeclarations,
  );

  return server;
}

export function assembleToolDeclarations(
  stableDeclarations: readonly AnyMcpToolDeclaration[],
  experimentalDeclarations: readonly AnyMcpToolDeclaration[],
  options: {
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
    logger: { warn(text: string): void };
  },
): AnyMcpToolDeclaration[] {
  let toolDeclarations = [...stableDeclarations];

  if (options.readOnly) {
    toolDeclarations = toolDeclarations.filter((tool) => tool.isReadOnly);
  }

  if (options.localOnly) {
    toolDeclarations = toolDeclarations.filter((tool) => tool.isLocalOnly);
  }

  const enabledExperimentalTools = new Set(options.experimentalTools);
  if (process.env['NG_MCP_CODE_EXAMPLES'] === '1') {
    enabledExperimentalTools.add('find_examples');
  }

  if (enabledExperimentalTools.size > 0) {
    const experimentalToolsMap = new Map(experimentalDeclarations.map((tool) => [tool.name, tool]));

    for (const toolName of enabledExperimentalTools) {
      const tool = experimentalToolsMap.get(toolName);
      if (tool) {
        toolDeclarations.push(tool);
      } else {
        options.logger.warn(`Unknown experimental tool: ${toolName}`);
      }
    }
  }

  return toolDeclarations;
}
