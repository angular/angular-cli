/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createStructuredContentOutput } from '../../utils';
import { resolveWorkspaceAndProject } from '../../workspace-utils';
import { type McpToolContext, declareTool } from '../tool-registry';
import { GenericTargetStrategy } from './generic-target-strategy';
import type { TargetStrategy } from './strategy';
import { type RunTargetInput, runTargetInputSchema, runTargetOutputSchema } from './types';

const FALLBACK_STRATEGY = new GenericTargetStrategy();
const STRATEGIES: TargetStrategy[] = [];

export async function runTarget(input: RunTargetInput, context: McpToolContext) {
  const { workspace, workspacePath, projectName } = await resolveWorkspaceAndProject({
    host: context.host,
    server: context.server,
    workspacePathInput: input.workspace,
    projectNameInput: input.project,
    mcpWorkspace: context.workspace,
  });

  const targetDefinition = workspace.projects.get(projectName)?.targets.get(input.target);
  const builder = targetDefinition?.builder;

  const strategy = STRATEGIES.find((s) => s.canHandle(input.target, builder)) ?? FALLBACK_STRATEGY;

  const result = await strategy.execute(
    {
      workspacePath,
      projectName,
      target: input.target,
      configuration: input.configuration,
      options: input.options,
    },
    context,
  );

  return createStructuredContentOutput(result);
}

export const RUN_TARGET_TOOL = declareTool({
  name: 'run_target',
  title: 'Run Project Target',
  description: `
<Purpose>
Executes a configured target (such as build, test, lint, e2e) for an Angular project.
This is the single, unified interface for executing all project tasks natively.
</Purpose>
<Use Cases>
* Building an application or library.
* Running unit tests, E2E tests, or linters.
* Deploying or running custom workspace targets discovered via 'list_projects'.
</Use Cases>
<Operational Notes>
* Mandatory Discovery: You MUST discover available project targets by calling 'list_projects' first.
* Watch mode (serve target or watch options) is NOT yet supported in this version of run_target.
  You MUST use the legacy 'devserver.*' tools for background server lifecycles.
</Operational Notes>`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: runTargetInputSchema.shape,
  outputSchema: runTargetOutputSchema.shape,
  factory: (context) => (input) => runTarget(input, context),
});
