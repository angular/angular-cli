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
import { type McpToolDeclaration, declareTool } from './tool-registry';

const DEFAULT_CONFIGURATION = 'development';

const buildStatusSchema = z.enum(['success', 'failure']);
type BuildStatus = z.infer<typeof buildStatusSchema>;

const buildToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to build in a monorepo context. If not provided, builds the default project.',
    ),
  configuration: z
    .string()
    .optional()
    .describe('Which build configuration to use. Defaults to "development".'),
});

export type BuildToolInput = z.infer<typeof buildToolInputSchema>;

const buildToolOutputSchema = z.object({
  status: buildStatusSchema.describe('Build status.'),
  logs: z.array(z.string()).optional().describe('Output logs from `ng build`.'),
  path: z.string().optional().describe('The output location for the build, if successful.'),
});

export type BuildToolOutput = z.infer<typeof buildToolOutputSchema>;

export async function runBuild(input: BuildToolInput, host: Host) {
  // Build "ng"'s command line.
  const args = ['build'];
  if (input.project) {
    args.push(input.project);
  }
  args.push('-c', input.configuration ?? DEFAULT_CONFIGURATION);

  let status: BuildStatus = 'success';
  let logs: string[] = [];
  let outputPath: string | undefined;

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

  for (const line of logs) {
    const match = line.match(/Output location: (.*)/);
    if (match) {
      outputPath = match[1].trim();
      break;
    }
  }

  const structuredContent: BuildToolOutput = {
    status,
    logs,
    path: outputPath,
  };

  return createStructuredContentOutput(structuredContent);
}

export const BUILD_TOOL: McpToolDeclaration<
  typeof buildToolInputSchema.shape,
  typeof buildToolOutputSchema.shape
> = declareTool({
  name: 'build',
  title: 'Build Tool',
  description: `
<Purpose>
Perform a one-off, non-watched build using "ng build". Use this tool whenever the user wants to build an Angular project; this is similar to
"ng build", but the tool is smarter about using the right configuration and collecting the output logs.
</Purpose>
<Use Cases>
* Building an Angular project and getting build logs back.
</Use Cases>
<Operational Notes>
* This tool runs "ng build" so it expects to run within an Angular workspace.
* If you want a watched build which updates as files are changed, use "start_devserver" instead, which also serves the app.
* You can provide a project instead of building the root one. The "list_projects" MCP tool could be used to obtain the list of projects.
* This tool defaults to a development environment while a regular "ng build" defaults to a production environment. An unexpected build
  failure might suggest the project is not configured for the requested environment.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: buildToolInputSchema.shape,
  outputSchema: buildToolOutputSchema.shape,
  factory: () => (input) => runBuild(input, LocalWorkspaceHost),
});
