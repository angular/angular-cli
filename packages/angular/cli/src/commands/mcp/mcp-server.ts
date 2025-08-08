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
import { McpToolDeclaration, registerTools } from './tools/tool-registry';

export async function createMcpServer(
  context: {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toolDeclarations: McpToolDeclaration<any, any>[] = [
    BEST_PRACTICES_TOOL,
    DOC_SEARCH_TOOL,
    LIST_PROJECTS_TOOL,
  ];
  const experimentalToolDeclarations = [FIND_EXAMPLE_TOOL, MODERNIZE_TOOL];

  if (context.readOnly) {
    toolDeclarations = toolDeclarations.filter((tool) => tool.isReadOnly);
  }

  if (context.localOnly) {
    toolDeclarations = toolDeclarations.filter((tool) => tool.isLocalOnly);
  }

  const enabledExperimentalTools = new Set(context.experimentalTools);
  if (process.env['NG_MCP_CODE_EXAMPLES'] === '1') {
    enabledExperimentalTools.add('find_examples');
  }

  if (enabledExperimentalTools.size > 0) {
    const experimentalToolsMap = new Map(
      experimentalToolDeclarations.map((tool) => [tool.name, tool]),
    );

    for (const toolName of enabledExperimentalTools) {
      const tool = experimentalToolsMap.get(toolName);
      if (tool) {
        toolDeclarations.push(tool);
      } else {
        logger.warn(`Unknown experimental tool: ${toolName}`);
      }
    }
  }

  await registerTools(
    server,
    {
      workspace: context.workspace,
      logger,
      exampleDatabasePath: path.join(__dirname, '../../../lib/code-examples.db'),
    },
    toolDeclarations,
  );

  return server;
}
