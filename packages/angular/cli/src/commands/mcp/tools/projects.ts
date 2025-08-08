/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import z from 'zod';
import { McpToolContext, declareTool } from './tool-registry';

export const LIST_PROJECTS_TOOL = declareTool({
  name: 'list_projects',
  title: 'List Angular Projects',
  description:
    'Lists the names of all applications and libraries defined within an Angular workspace. ' +
    'It reads the `angular.json` configuration file to identify the projects. ',
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
  isReadOnly: true,
  isLocalOnly: true,
  shouldRegister: (context) => !!context.workspace,
  factory: createListProjectsHandler,
});

function createListProjectsHandler({ workspace }: McpToolContext) {
  return async () => {
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
        structuredContent: { projects: [] },
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
  };
}
