/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { BuildStatus } from '../dev-server';
import { createStructureContentOutput } from '../utils';
import { DEFAULT_PROJECT_KEY } from './start-devserver';
import { McpToolContext, McpToolDeclaration, declareTool } from './tool-registry';

const DEBOUNCE_DELAY = 500;

const waitForDevserverBuildToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to wait for in a monorepo context. If not provided, waits for the default project server.',
    ),
  timeout: z
    .number()
    .optional()
    .default(30000)
    .describe('The maximum time to wait for the build to complete, in milliseconds.'),
});

export type WaitForDevserverBuildToolInput = z.infer<typeof waitForDevserverBuildToolInputSchema>;

const waitForDevserverBuildToolOutputSchema = z.object({
  status: z
    .enum(['success', 'failure', 'unknown', 'timeout', 'no_build_found'])
    .describe('The status of the build wait operation.'),
  logs: z.array(z.string()).optional().describe('The logs from the most recent build.'),
});

export type WaitForDevserverBuildToolOutput = z.infer<typeof waitForDevserverBuildToolOutputSchema>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevserverBuild(
  input: WaitForDevserverBuildToolInput,
  context: McpToolContext,
) {
  const projectKey = input.project ?? DEFAULT_PROJECT_KEY;
  const devServer = context.devServers?.get(projectKey);
  const deadline = Date.now() + input.timeout;

  if (!devServer) {
    return createStructureContentOutput({
      status: 'no_build_found',
      message: 'Development server for this project is not running.',
    });
  }

  await wait(DEBOUNCE_DELAY);
  while (devServer.isBuilding()) {
    if (Date.now() > deadline) {
      return createStructureContentOutput({
        status: 'timeout',
        message: `Timed out after ${input.timeout}ms when waiting for this project to build.`,
      });
    }
    await wait(DEBOUNCE_DELAY);
  }

  return createStructureContentOutput({
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
Waits for the current dev server build to complete.
</Purpose>
<Use Cases>
* **Waiting for a build:** After making a file change that triggers a rebuild, use this tool to wait for the build to finish.
  It will then return just the status and logs from that most recent build.
</Use Cases>
<Operational Notes>
* This tool will block until the build is complete or the timeout is reached.
* If the dev server is not building, it will return immediately with the logs from the last build.
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
