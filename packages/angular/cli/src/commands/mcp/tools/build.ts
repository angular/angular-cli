/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { CommandError, Host, LocalWorkspaceHost } from '../host';
import { McpToolContext, McpToolDeclaration, declareTool } from './tool-registry';

const CONFIGURATIONS = {
  development: {
    args: '-c development',
  },
  production: {
    args: '',
  },
};

const BUILD_STATUSES = ['success', 'failure'] as const;
type BuildStatus = (typeof BUILD_STATUSES)[number];

const buildToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to build in a monorepo context. If not provided, builds the top-level project.',
    ),
  configuration: z
    .enum(Object.keys(CONFIGURATIONS) as [string, ...string[]])
    .optional()
    .describe('Which build configuration to use. Defaults to "development".'),
});

export type BuildToolInput = z.infer<typeof buildToolInputSchema>;

const buildToolOutputSchema = z.object({
  status: z.enum(BUILD_STATUSES).describe('Build status.'),
  stdout: z.string().optional().describe('The standard output from `ng build`.'),
  stderr: z.string().optional().describe('The standard error from `ng build`.'),
  path: z.string().optional().describe('The output path the build project was written into.'),
});

export type BuildToolOutput = z.infer<typeof buildToolOutputSchema>;

export async function runBuild(input: BuildToolInput, host: Host) {
  const configurationName = input.configuration ?? 'development';
  const configuration = CONFIGURATIONS[configurationName as keyof typeof CONFIGURATIONS];
  const args = ['build'];
  if (input.project) {
    args.push(input.project);
  }
  if (configuration.args) {
    args.push(configuration.args);
  }

  let status: BuildStatus = 'success';
  let stdout = '';
  let stderr = '';
  let outputPath: string | undefined;

  try {
    const result = await host.runCommand('ng', args);
    stdout = result.stdout;
    stderr = result.stderr;
    const match = stdout.match(/Output location: (.*)/);
    if (match) {
      outputPath = match[1].trim();
    }
  } catch (e) {
    status = 'failure';
    if (e instanceof CommandError) {
      stdout = e.stdout;
      stderr = e.stderr;
    } else if (e instanceof Error) {
      stderr = e.message;
    }
  }

  const structuredContent: BuildToolOutput = {
    status,
    stdout,
    stderr,
    path: outputPath,
  };

  return createStructureContentOutput(structuredContent);
}

export const BUILD_TOOL: McpToolDeclaration<
  typeof buildToolInputSchema.shape,
  typeof buildToolOutputSchema.shape
> = declareTool({
  name: 'build',
  title: 'Build Tool',
  description: `
<Purpose>
Perform a one-off, non-watched build with "ng build". Use this tool whenever
the user wants to build an Angular project; this is similar to "ng build", but
the tool is smarter about using the right configuration and collecting the
output logs.
</Purpose>
<Use Cases>
* Building the Angular project and getting build logs back.
</Use Cases>
<Operational Notes>
* This tool runs "ng build" so it expects to run within an Angular workspace.
* You can provide a project instead of building the root one. The
  "list_projects" MCP tool could be used to obtain the list of projects.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: buildToolInputSchema.shape,
  outputSchema: buildToolOutputSchema.shape,
  factory: () => (input) => runBuild(input, LocalWorkspaceHost),
});
