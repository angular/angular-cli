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
      title: 'Angular Best Practices and Code Generation Guide',
      description:
        "A comprehensive guide detailing Angular's best practices for code generation and development. " +
        'This guide should be used as a reference by an LLM to ensure any generated code ' +
        'adheres to modern Angular standards, including the use of standalone components, ' +
        'typed forms, modern control flow syntax, and other current conventions.',
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
      title: 'List Angular Projects',
      description:
        'Lists the names of all applications and libraries defined within an Angular workspace. ' +
        'It reads the `angular.json` configuration file to identify the projects. ',
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const { workspace } = context;

      if (!workspace) {
        return {
          content: [
            {
              type: 'text' as const,
              text:
                'No Angular workspace found.' +
                ' An `angular.json` file, which marks the root of a workspace,' +
                ' could not be located in the current directory or any of its parent directories.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Projects in the Angular workspace: ' + [...workspace.projects.keys()].join(','),
          },
        ],
      };
    },
  );

  return server;
}
