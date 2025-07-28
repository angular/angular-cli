/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AngularWorkspace } from '../../utilities/config';
import { VERSION } from '../../utilities/version';
import { registerBestPracticesTool } from './tools/best-practices';
import { registerDocSearchTool } from './tools/doc-search';
import { registerListProjectsTool } from './tools/projects';

export async function createMcpServer(context: {
  workspace?: AngularWorkspace;
}): Promise<McpServer> {
  const server = new McpServer({
    name: 'angular-cli-server',
    version: VERSION.full,
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  server.registerResource(
    'instructions',
    'instructions://best-practices',
    {
      title: 'Angular Best Practices and Code Generation Guide',
      description:
        "A comprehensive guide detailing Angular's best practices for code generation and development." +
        ' This guide should be used as a reference by an LLM to ensure any generated code' +
        ' adheres to modern Angular standards, including the use of standalone components,' +
        ' typed forms, modern control flow syntax, and other current conventions.',
      mimeType: 'text/markdown',
    },
    async () => {
      const text = await readFile(
        path.join(__dirname, 'instructions', 'best-practices.md'),
        'utf-8',
      );

      return { contents: [{ uri: 'instructions://best-practices', text }] };
    },
  );

  registerBestPracticesTool(server);

  // If run outside an Angular workspace (e.g., globally) skip the workspace specific tools.
  // Currently only the `list_projects` tool.
  if (!context.workspace) {
    registerListProjectsTool(server, context);
  }

  await registerDocSearchTool(server);

  return server;
}
