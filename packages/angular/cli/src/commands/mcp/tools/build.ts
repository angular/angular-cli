/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { declareTool } from './tool-registry';

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
  logs: z.string().describe('Output logs from `ng build`.'),
  path: z.string().optional().describe('The output path the build project was written into.'),
});

export type BuildToolOutput = z.infer<typeof buildToolOutputSchema>;

export function runBuild(input: BuildToolInput) {
  const configurationName = input.configuration ?? 'development';
  const configuration = CONFIGURATIONS[configurationName as keyof typeof CONFIGURATIONS];
  const command = ['ng', 'build'];
  if (input.project) {
    command.push(input.project);
  }
  if (configuration.args) {
    command.push(configuration.args);
  }

  let status: BuildStatus = 'success';
  let logs = '';
  let outputPath: string | undefined;

  try {
    logs = execSync(command.join(' ')).toString();
    const match = logs.match(/Output location: (.*)/);
    if (match) {
      outputPath = match[1].trim();
    }
  } catch (e) {
    status = 'failure';
    if (e instanceof Error) {
      logs = e.message;
      if ('stdout' in e) {
        logs += `\nSTDOUT:\n${(e as { stdout: Buffer }).stdout.toString()}`;
      }
      if ('stderr' in e) {
        logs += `\nSTDERR:\n${(e as { stderr: Buffer }).stderr.toString()}`;
      }
    }
  }

  const structuredContent: BuildToolOutput = {
    status,
    logs,
    path: outputPath,
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export const BUILD_TOOL = declareTool({
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
  factory: () => (input: BuildToolInput) => runBuild(input),
});
