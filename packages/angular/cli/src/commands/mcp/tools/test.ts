/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { workspaceAndProjectOptions } from '../shared-options';
import { createStructuredContentOutput, getCommandErrorLogs } from '../utils';
import { resolveWorkspaceAndProject } from '../workspace-utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from './tool-registry';

const testStatusSchema = z.enum(['success', 'failure']);
type TestStatus = z.infer<typeof testStatusSchema>;

const testToolInputSchema = z.object({
  ...workspaceAndProjectOptions,
  filter: z.string().optional().describe('Filter the executed tests by spec name.'),
});

export type TestToolInput = z.infer<typeof testToolInputSchema>;

const testToolOutputSchema = z.object({
  status: testStatusSchema.describe('Test execution status.'),
  logs: z.array(z.string()).optional().describe('Output logs from `ng test`.'),
});

export type TestToolOutput = z.infer<typeof testToolOutputSchema>;

function shouldUseHeadlessOption(
  testTarget: import('@angular-devkit/core').workspaces.TargetDefinition | undefined,
): boolean {
  return (
    testTarget?.builder === '@angular/build:unit-test' && testTarget.options?.['runner'] !== 'karma'
  );
}

export async function runTest(input: TestToolInput, context: McpToolContext) {
  const { workspace, workspacePath, projectName } = await resolveWorkspaceAndProject({
    host: context.host,
    workspacePathInput: input.workspace,
    projectNameInput: input.project,
    mcpWorkspace: context.workspace,
  });

  // Build "ng"'s command line.
  const args = ['test', projectName];

  if (shouldUseHeadlessOption(workspace.projects.get(projectName)?.targets.get('test'))) {
    args.push('--headless', 'true');
  } else {
    // Karma-based projects need an explicit headless browser for non-interactive MCP execution.
    args.push('--browsers', 'ChromeHeadless');
  }

  args.push('--watch', 'false');

  if (input.filter) {
    args.push('--filter', input.filter);
  }

  let status: TestStatus = 'success';
  let logs: string[];

  try {
    logs = (await context.host.executeNgCommand(args, { cwd: workspacePath })).logs;
  } catch (e) {
    status = 'failure';
    logs = getCommandErrorLogs(e);
  }

  const structuredContent: TestToolOutput = {
    status,
    logs,
  };

  return createStructuredContentOutput(structuredContent);
}

export const TEST_TOOL: McpToolDeclaration<
  typeof testToolInputSchema.shape,
  typeof testToolOutputSchema.shape
> = declareTool({
  name: 'test',
  title: 'Test Tool',
  description: `
<Purpose>
Perform a one-off, non-watched unit test execution with ng test.
</Purpose>
<Use Cases>
* Running unit tests for the project.
* Verifying code changes with tests.
</Use Cases>
<Operational Notes>
* This tool uses "ng test".
* It supports filtering by spec name if the underlying builder supports it (e.g., 'unit-test' builder).
* For the "@angular/build:unit-test" builder with Vitest, this tool requests headless execution via "--headless true".
* For Karma-based projects, this tool forces headless Chrome with "--browsers ChromeHeadless", so Chrome must be installed.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: testToolInputSchema.shape,
  outputSchema: testToolOutputSchema.shape,
  factory: (context) => (input) => runTest(input, context),
});
