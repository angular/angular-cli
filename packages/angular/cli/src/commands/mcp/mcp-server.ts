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
      title: 'Angular System Instructions',
      description:
        'A set of instructions to help LLMs generate correct code that follows Angular best practices.',
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

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List projects within an Angular workspace.' +
        ' This information is read from the `angular.json` file at the root path of the Angular workspace',
    },
    () => {
      if (!context.workspace) {
        return {
          content: [
            {
              type: 'text',
              text: 'Not within an Angular project.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text:
              'Projects in the Angular workspace: ' +
              [...context.workspace.projects.keys()].join(','),
          },
        ],
      };
    },
  );

  return server;
}
