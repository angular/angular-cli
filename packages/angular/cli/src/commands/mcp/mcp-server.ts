/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RootsListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AngularWorkspace } from '../../utilities/config';
import { VERSION } from '../../utilities/version';
import type { Devserver } from './devserver';
import { LocalWorkspaceHost, createRootRestrictedHost } from './host';
import { registerInstructionsResource } from './resources/instructions';
import { AI_TUTOR_TOOL } from './tools/ai-tutor';
import { BEST_PRACTICES_TOOL } from './tools/best-practices';
import { BUILD_TOOL } from './tools/build';
import { DEVSERVER_START_TOOL } from './tools/devserver/devserver-start';
import { DEVSERVER_STOP_TOOL } from './tools/devserver/devserver-stop';
import { DEVSERVER_WAIT_FOR_BUILD_TOOL } from './tools/devserver/devserver-wait-for-build';
import { DOC_SEARCH_TOOL } from './tools/doc-search';
import { E2E_TOOL } from './tools/e2e';
import { ZONELESS_MIGRATION_TOOL } from './tools/onpush-zoneless-migration/zoneless-migration';
import { LIST_PROJECTS_TOOL } from './tools/projects';
import { TEST_TOOL } from './tools/test';
import { type AnyMcpToolDeclaration, registerTools } from './tools/tool-registry';

/**
 * Tools to manage devservers. Should be bundled together, then added to experimental or stable as a group.
 */
const DEVSERVER_TOOLS = [DEVSERVER_START_TOOL, DEVSERVER_STOP_TOOL, DEVSERVER_WAIT_FOR_BUILD_TOOL];

/**
 * The set of tools that are enabled by default for the MCP server.
 * These tools are considered stable and suitable for general use.
 */
const STABLE_TOOLS = [
  AI_TUTOR_TOOL,
  BEST_PRACTICES_TOOL,
  DOC_SEARCH_TOOL,
  LIST_PROJECTS_TOOL,
  ZONELESS_MIGRATION_TOOL,
] as const;

/**
 * The set of tools that are available but not enabled by default.
 * These tools are considered experimental and may have limitations.
 */
export const EXPERIMENTAL_TOOLS = [BUILD_TOOL, E2E_TOOL, TEST_TOOL, ...DEVSERVER_TOOLS] as const;

/**
 * Experimental tools that are grouped together under a single name.
 *
 * Used for enabling them as a group.
 */
export const EXPERIMENTAL_TOOL_GROUPS = {
  'all': EXPERIMENTAL_TOOLS,
  'devserver': DEVSERVER_TOOLS,
};

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

* **4. Discover Schematics for Modernization:** Since this server does not provide a
  specific tool for listing available schematics, you can use a shell command (if
  available) with \`ng generate <package-name>: --help\` to discover what migrations
  are available in a package (e.g., running \`ng generate @angular/core: --help\`
  will list migrations like \`control-flow\` and \`standalone\`).
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

  const restrictedHost = createRootRestrictedHost(LocalWorkspaceHost);

  server.server.oninitialized = () => {
    void (async () => {
      try {
        const clientCapabilities = server.server.getClientCapabilities();
        if (clientCapabilities?.roots) {
          const { roots } = await server.server.listRoots();
          const searchRoots = roots?.map((r) => normalize(fileURLToPath(r.uri))) ?? [];
          restrictedHost.setRoots(searchRoots);

          if (clientCapabilities.roots.listChanged) {
            server.server.setNotificationHandler(RootsListChangedNotificationSchema, async () => {
              try {
                const { roots: updatedRoots } = await server.server.listRoots();
                const updatedSearchRoots =
                  updatedRoots?.map((r) => normalize(fileURLToPath(r.uri))) ?? [];
                restrictedHost.setRoots(updatedSearchRoots);
              } catch (e) {
                logger.warn(
                  `Failed to update roots on notification: ${e instanceof Error ? e.message : e}`,
                );
              }
            });
          }
        }
      } catch (e) {
        logger.warn(
          `Failed to initialize roots on connection: ${e instanceof Error ? e.message : e}`,
        );
      }
    })();
  };

  await registerTools(
    server,
    {
      workspace: options.workspace,
      logger,
      exampleDatabasePath: join(__dirname, '../../../lib/code-examples.db'),
      devservers: new Map<string, Devserver>(),
      host: restrictedHost,
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
  for (const [toolGroupName, toolGroup] of Object.entries(EXPERIMENTAL_TOOL_GROUPS)) {
    if (enabledExperimentalTools.delete(toolGroupName)) {
      for (const tool of toolGroup) {
        enabledExperimentalTools.add(tool.name);
      }
    }
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
