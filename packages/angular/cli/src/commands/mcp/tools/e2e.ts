/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { CommandError, type Host, LocalWorkspaceHost } from '../host';
import { createStructuredContentOutput } from '../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from './tool-registry';

const e2eStatusSchema = z.enum(['success', 'failure']);
type E2eStatus = z.infer<typeof e2eStatusSchema>;

const e2eToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to test in a monorepo context. If not provided, tests the default project.',
    ),
});

export type E2eToolInput = z.infer<typeof e2eToolInputSchema>;

const e2eToolOutputSchema = z.object({
  status: e2eStatusSchema.describe('E2E execution status.'),
  logs: z.array(z.string()).optional().describe('Output logs from `ng e2e`.'),
});

export type E2eToolOutput = z.infer<typeof e2eToolOutputSchema>;

export async function runE2e(input: E2eToolInput, host: Host, context: McpToolContext) {
  const projectName = input.project;

  if (context.workspace) {
    let targetProject;
    const projects = context.workspace.projects;

    if (projectName) {
      targetProject = projects.get(projectName);
    } else {
      // Try to find default project
      const defaultProjectName = context.workspace.extensions['defaultProject'] as
        | string
        | undefined;
      if (defaultProjectName) {
        targetProject = projects.get(defaultProjectName);
      } else if (projects.size === 1) {
        targetProject = Array.from(projects.values())[0];
      }
    }

    if (targetProject) {
      if (!targetProject.targets.has('e2e')) {
        return createStructuredContentOutput({
          status: 'failure',
          logs: [
            `No e2e target is defined for project '${projectName ?? 'default'}'. Please setup e2e testing first.`,
          ],
        });
      }
    }
  }

  // Build "ng"'s command line.
  const args = ['e2e'];
  if (input.project) {
    args.push(input.project);
  }

  let status: E2eStatus = 'success';
  let logs: string[] = [];

  try {
    logs = (await host.runCommand('ng', args)).logs;
  } catch (e) {
    status = 'failure';
    if (e instanceof CommandError) {
      logs = e.logs;
    } else if (e instanceof Error) {
      logs = [e.message];
    } else {
      logs = [String(e)];
    }
  }

  const structuredContent: E2eToolOutput = {
    status,
    logs,
  };

  return createStructuredContentOutput(structuredContent);
}

export const E2E_TOOL: McpToolDeclaration<
  typeof e2eToolInputSchema.shape,
  typeof e2eToolOutputSchema.shape
> = declareTool({
  name: 'e2e',
  title: 'E2E Tool',
  description: `
<Purpose>
Perform an end-to-end test with ng e2e.
</Purpose>
<Use Cases>
* Running end-to-end tests for the project.
</Use Cases>
<Operational Notes>
* This tool runs "ng e2e".
* It will error if no "e2e" target is defined in the project, to avoid interactive setup prompts.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: e2eToolInputSchema.shape,
  outputSchema: e2eToolOutputSchema.shape,
  factory: (context) => (input) => runE2e(input, LocalWorkspaceHost, context),
});
