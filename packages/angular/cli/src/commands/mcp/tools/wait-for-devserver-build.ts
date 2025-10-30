/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { devServerKey } from '../dev-server';
import { createStructureContentOutput } from '../utils';
import { McpToolContext, McpToolDeclaration, declareTool } from './tool-registry';

/**
 * How long to wait to give "ng serve" time to identify whether the watched workspace has changed.
 */
const DEBOUNCE_DELAY = 1000;

const waitForDevserverBuildToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to wait for in a monorepo context. If not provided, waits for the default project server.',
    ),
  timeout: z
    .number()
    .default(30000)
    .describe('The maximum time to wait for the build to complete, in milliseconds.'),
});

export type WaitForDevserverBuildToolInput = z.infer<typeof waitForDevserverBuildToolInputSchema>;

const waitForDevserverBuildToolOutputSchema = z.object({
  status: z
    .enum(['success', 'failure', 'unknown', 'timeout', 'no_devserver_found'])
    .describe(
      "The status of the build if it's complete, or a status indicating why the wait operation failed.",
    ),
  logs: z
    .array(z.string())
    .optional()
    .describe('The logs from the most recent build, if one exists.'),
});

export type WaitForDevserverBuildToolOutput = z.infer<typeof waitForDevserverBuildToolOutputSchema>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForDevserverBuild(
  input: WaitForDevserverBuildToolInput,
  context: McpToolContext,
) {
  const projectKey = devServerKey(input.project);
  const devServer = context.devServers.get(projectKey);
  const deadline = Date.now() + input.timeout;

  if (!devServer) {
    return createStructureContentOutput<WaitForDevserverBuildToolOutput>({
      status: 'no_devserver_found',
    });
  }

  await wait(DEBOUNCE_DELAY);
  while (devServer.isBuilding()) {
    if (Date.now() > deadline) {
      return createStructureContentOutput<WaitForDevserverBuildToolOutput>({
        status: 'timeout',
      });
    }
    await wait(DEBOUNCE_DELAY);
  }

  return createStructureContentOutput<WaitForDevserverBuildToolOutput>({
    ...devServer.getMostRecentBuild(),
  });
}

export const WAIT_FOR_DEVSERVER_BUILD_TOOL: McpToolDeclaration<
  typeof waitForDevserverBuildToolInputSchema.shape,
  typeof waitForDevserverBuildToolOutputSchema.shape
> = declareTool({
  name: 'wait_for_devserver_build',
  title: 'Wait for Devserver Build',
  description: `
<Purpose>
Waits for a dev server that was started with the "start_devserver" tool to complete its build, then reports the build logs from its most
recent build.
</Purpose>
<Use Cases>
* **Waiting for a build:** After making a file change that triggers a rebuild, use this tool to wait for the build to finish. It will then
  return just the status and logs from that most recent build.
</Use Cases>
<Operational Notes>
* This tool expects that a dev server was launched on the same project with the "start_devserver" tool, otherwise a "no_devserver_found"
  status will be returned.
* This tool will block until the build is complete or the timeout is reached. If you expect a long build process, consider increasing the
  timeout.
* If the dev server is not building, it will return quickly, with the logs from the last build.
* A 'no_devserver_found' status can indicate the underlying server was stopped for some reason. Try first to call the "start_devserver"
  tool again, before giving up.
</Operational Notes>
`,
  isReadOnly: true,
  isLocalOnly: true,
  inputSchema: waitForDevserverBuildToolInputSchema.shape,
  outputSchema: waitForDevserverBuildToolOutputSchema.shape,
  factory: (context) => (input) => {
    return waitForDevserverBuild(input, context);
  },
});
