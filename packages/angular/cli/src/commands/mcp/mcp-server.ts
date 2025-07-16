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
import { z } from 'zod';
import type { AngularWorkspace } from '../../utilities/config';
import { VERSION } from '../../utilities/version';
import { registerDocSearchTool } from './tools/doc-search';
import { registerUpdateTool } from './tools/update';

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
      outputSchema: {
        projects: z.array(
          z.object({
            name: z
              .string()
              .describe('The name of the project, as defined in the `angular.json` file.'),
            type: z
              .enum(['application', 'library'])
              .optional()
              .describe(`The type of the project, either 'application' or 'library'.`),
            root: z
              .string()
              .describe('The root directory of the project, relative to the workspace root.'),
            sourceRoot: z
              .string()
              .describe(
                `The root directory of the project's source files, relative to the workspace root.`,
              ),
            selectorPrefix: z
              .string()
              .optional()
              .describe(
                'The prefix to use for component selectors.' +
                  ` For example, a prefix of 'app' would result in selectors like '<app-my-component>'.`,
              ),
          }),
        ),
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

      const projects = [];
      // Convert to output format
      for (const [name, project] of workspace.projects.entries()) {
        projects.push({
          name,
          type: project.extensions['projectType'] as 'application' | 'library' | undefined,
          root: project.root,
          sourceRoot: project.sourceRoot ?? path.posix.join(project.root, 'src'),
          selectorPrefix: project.extensions['prefix'] as string,
        });
      }

      // The structuredContent field is newer and may not be supported by all hosts.
      // A text representation of the content is also provided for compatibility.
      return {
        content: [
          {
            type: 'text' as const,
            text: `Projects in the Angular workspace:\n${JSON.stringify(projects)}`,
          },
        ],
        structuredContent: { projects },
      };
    },
  );

  await registerDocSearchTool(server);
  await registerUpdateTool(server);

  return server;
}
