/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { createDevServerNotFoundError, getDevserverKey } from '../../devserver';
import { workspaceAndProjectOptions } from '../../shared-options';
import { createStructuredContentOutput } from '../../utils';
import { resolveWorkspaceAndProject } from '../../workspace-utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';

/**
 * Maximum time to wait for the build logs of a completed rebuild to be received from the
 * dev server process output.
 */
const LOG_FLUSH_TIMEOUT = 2_000; // In milliseconds

const LOG_FLUSH_INTERVAL = 50; // In milliseconds

const devserverRebuildToolInputSchema = z.object({
  ...workspaceAndProjectOptions,
});

export type DevserverRebuildToolInput = z.infer<typeof devserverRebuildToolInputSchema>;

const devserverRebuildToolOutputSchema = z.object({
  status: z
    .enum(['success', 'failure', 'no-changes', 'cancelled'])
    .describe(
      'The outcome of the rebuild. "no-changes" means no file changes were pending so no rebuild was performed. ' +
        '"cancelled" means the dev server stopped before the rebuild could complete.',
    ),
  logs: z
    .array(z.string())
    .optional()
    .describe('The logs from the most recent build, if a rebuild was performed.'),
});

export type DevserverRebuildToolOutput = z.infer<typeof devserverRebuildToolOutputSchema>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rebuildDevserver(input: DevserverRebuildToolInput, context: McpToolContext) {
  const { workspacePath, projectName } = await resolveWorkspaceAndProject({
    host: context.host,
    server: context.server,
    workspacePathInput: input.workspace,
    projectNameInput: input.project,
    mcpWorkspace: context.workspace,
  });
  const key = getDevserverKey(workspacePath, projectName);
  const devserver = context.devservers.get(key);

  if (!devserver) {
    throw createDevServerNotFoundError(context.devservers);
  }

  if (!devserver.manualRebuild) {
    throw new Error(
      `Development server for project '${projectName}' was not started in manual rebuild mode and ` +
        'rebuilds automatically on file changes. Use "devserver_wait_for_build" instead, or restart it ' +
        'with "devserver_start" and the "manualRebuild" option.',
    );
  }

  const status = await devserver.requestRebuild();
  if (status !== 'success' && status !== 'failure') {
    return createStructuredContentOutput<DevserverRebuildToolOutput>({ status, logs: undefined });
  }

  // The rebuild has completed but its log output may still be in transit from the process.
  const deadline = Date.now() + LOG_FLUSH_TIMEOUT;
  while (devserver.isBuilding() && Date.now() < deadline) {
    await wait(LOG_FLUSH_INTERVAL);
  }

  return createStructuredContentOutput<DevserverRebuildToolOutput>({
    status,
    logs: devserver.getMostRecentBuild().logs,
  });
}

export const DEVSERVER_REBUILD_TOOL: McpToolDeclaration<
  typeof devserverRebuildToolInputSchema.shape,
  typeof devserverRebuildToolOutputSchema.shape
> = declareTool({
  name: 'devserver_rebuild',
  title: 'Rebuild Devserver',
  description: `
<Purpose>
Triggers an incremental rebuild of a dev server that was started with the "devserver_start" tool in manual rebuild mode
("manualRebuild" option), waits for it to complete, and reports the build status and logs.
</Purpose>
<Use Cases>
* **Applying a batch of changes:** After finishing a set of file edits (possibly across many files), call this tool once to
  rebuild all of the changes together. This avoids repeated intermediate rebuilds while files are still being edited.
* **Checking a change compiles:** The returned status and logs indicate whether the rebuild succeeded and contain any
  build errors to fix.
</Use Cases>
<Operational Notes>
* This tool only works for dev servers started with "devserver_start" and "manualRebuild" set to true. Dev servers started
  without it rebuild automatically; use "devserver_wait_for_build" for those instead.
* The dev server tracks file changes continuously, so only the files changed since the previous rebuild are recompiled.
* If no files changed since the previous rebuild, the tool returns the "no-changes" status without rebuilding.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: devserverRebuildToolInputSchema.shape,
  outputSchema: devserverRebuildToolOutputSchema.shape,
  factory: (context) => (input) => {
    return rebuildDevserver(input, context);
  },
});
