/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { join } from 'node:path';
import type { AngularWorkspace } from '../../utilities/config';
import { VERSION } from '../../utilities/version';
import type { DevServer } from './dev-server';
import { registerInstructionsResource } from './resources/instructions';
import { AI_TUTOR_TOOL } from './tools/ai-tutor';
import { BEST_PRACTICES_TOOL } from './tools/best-practices';
import { BUILD_TOOL } from './tools/build';
import { START_DEVSERVER_TOOL } from './tools/devserver/start-devserver';
import { STOP_DEVSERVER_TOOL } from './tools/devserver/stop-devserver';
import { WAIT_FOR_DEVSERVER_BUILD_TOOL } from './tools/devserver/wait-for-devserver-build';
import { DOC_SEARCH_TOOL } from './tools/doc-search';
import { FIND_EXAMPLE_TOOL } from './tools/examples';
import { MODERNIZE_TOOL } from './tools/modernize';
import { ZONELESS_MIGRATION_TOOL } from './tools/onpush-zoneless-migration/zoneless-migration';
import { LIST_PROJECTS_TOOL } from './tools/projects';
import { type AnyMcpToolDeclaration, registerTools } from './tools/tool-registry';

/**
 * Tools to manage devservers. Should be bundled together, then added to experimental or stable as a group.
 */
const SERVE_TOOLS = [START_DEVSERVER_TOOL, STOP_DEVSERVER_TOOL, WAIT_FOR_DEVSERVER_BUILD_TOOL];

/**
 * The set of tools that are enabled by default for the MCP server.
 * These tools are considered stable and suitable for general use.
 */
const STABLE_TOOLS = [
  AI_TUTOR_TOOL,
  BEST_PRACTICES_TOOL,
  DOC_SEARCH_TOOL,
  FIND_EXAMPLE_TOOL,
  LIST_PROJECTS_TOOL,
  ZONELESS_MIGRATION_TOOL,
] as const;

/**
 * The set of tools that are available but not enabled by default.
 * These tools are considered experimental and may have limitations.
 */
export const EXPERIMENTAL_TOOLS = [BUILD_TOOL, MODERNIZE_TOOL, ...SERVE_TOOLS] as const;

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
      instructions: `
<General Purpose>
This server provides a safe, programmatic interface to the Angular CLI for an AI assistant.
Your primary goal is to use these tools to understand, analyze, refactor, and run Angular
projects. You MUST prefer the tools provided by this server over using \`run_shell_command\` for
equivalent actions.
</General Purpose>

<Core Workflows & Tool Guide>
* **1. Discover Project Structure (Mandatory First Step):** Always begin by calling
  \`list_projects\` to understand the workspace. The \`path\` property for a workspace
  is a required input for other tools.

* **2. Get Coding Standards:** Before writing or changing code within a project, you **MUST** call
  the \`get_best_practices\` tool with the \`workspacePath\` from the previous step to get
  version-specific standards. For general knowledge, you can call the tool without this path.

* **3. Answer User Questions:**
    - For conceptual questions ("what is..."), use \`search_documentation\`.
    - For code examples ("show me how to..."), use \`find_examples\`.
</Core Workflows & Tool Guide>

<Key Concepts>
* **Workspace vs. Project:** A 'workspace' contains an \`angular.json\` file and defines 'projects'
  (applications or libraries). A monorepo can have multiple workspaces.
* **Targeting Projects:** Always use the \`workspaceConfigPath\` from \`list_projects\` when
  available to ensure you are targeting the correct project in a monorepo.
</Key Concepts>
`,
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
      exampleDatabasePath: join(__dirname, '../../../lib/code-examples.db'),
      devServers: new Map<string, DevServer>(),
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
