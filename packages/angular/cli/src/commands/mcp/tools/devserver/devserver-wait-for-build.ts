/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { createStructuredContentOutput, getDefaultProjectName } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';

/**
 * How long to wait to give "ng serve" time to identify whether the watched workspace has changed.
 */
export const WATCH_DELAY = 1000;

/**
 * Default timeout for waiting for the build to complete.
 */
const DEFAULT_TIMEOUT = 180_000; // In milliseconds

const devserverWaitForBuildToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to wait for in a monorepo context. If not provided, waits for the default project server.',
    ),
  timeout: z
    .number()
    .default(DEFAULT_TIMEOUT)
    .describe(
      `The maximum time to wait for the build to complete, in milliseconds. This can't be lower than ${WATCH_DELAY}.`,
    ),
});

export type DevserverWaitForBuildToolInput = z.infer<typeof devserverWaitForBuildToolInputSchema>;

const devserverWaitForBuildToolOutputSchema = z.object({
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

export type DevserverWaitForBuildToolOutput = z.infer<typeof devserverWaitForBuildToolOutputSchema>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForDevserverBuild(
  input: DevserverWaitForBuildToolInput,
  context: McpToolContext,
) {
  if (context.devservers.size === 0) {
    return createStructuredContentOutput({
      status: 'no_devserver_found',
      logs: undefined,
    });
  }

  let projectName = input.project ?? getDefaultProjectName(context);

  if (!projectName) {
    // This should not happen. But if there's just a single running devserver, wait for it.
    if (context.devservers.size === 1) {
      projectName = Array.from(context.devservers.keys())[0];
    } else {
      return createStructuredContentOutput({
        status: 'no_devserver_found',
        logs: undefined,
      });
    }
  }

  const devServer = context.devservers.get(projectName);

  if (!devServer) {
    return createStructuredContentOutput<DevserverWaitForBuildToolOutput>({
      status: 'no_devserver_found',
      logs: undefined,
    });
  }

  const deadline = Date.now() + input.timeout;
  await wait(WATCH_DELAY);
  while (devServer.isBuilding()) {
    if (Date.now() > deadline) {
      return createStructuredContentOutput<DevserverWaitForBuildToolOutput>({
        status: 'timeout',
        logs: undefined,
      });
    }
    await wait(WATCH_DELAY);
  }

  return createStructuredContentOutput<DevserverWaitForBuildToolOutput>({
    ...devServer.getMostRecentBuild(),
  });
}

export const DEVSERVER_WAIT_FOR_BUILD_TOOL: McpToolDeclaration<
  typeof devserverWaitForBuildToolInputSchema.shape,
  typeof devserverWaitForBuildToolOutputSchema.shape
> = declareTool({
  name: 'devserver.wait_for_build',
  title: 'Wait for Devserver Build',
  description: `
<Purpose>
Waits for a dev server that was started with the "devserver.start" tool to complete its build, then reports the build logs from its most
recent build.
</Purpose>
<Use Cases>
* **Waiting for a build:** As long as a devserver is alive ("devserver.start" was called for this project and "devserver.stop" wasn't
  called yet), then if you're making a file change and want to ensure it was successfully built, call this tool instead of any other build
  tool or command. When it retuns you'll get build logs back **and** you'll know the user's devserver is up-to-date with the latest changes.
</Use Cases>
<Operational Notes>
* This tool expects that a dev server was launched on the same project with the "devserver.start" tool, otherwise a "no_devserver_found"
  status will be returned.
* This tool will block until the build is complete or the timeout is reached. If you expect a long build process, consider increasing the
  timeout. Timeouts on initial run (right after "devserver.start" calls) or after a big change are not necessarily indicative of an error.
* If you encountered a timeout and it might be reasonable, just call this tool again.
* If the dev server is not building, it will return quickly, with the logs from the last build.
* A 'no_devserver_found' status can indicate the underlying server was stopped for some reason. Try first to call the "devserver.start"
  tool again, before giving up.
</Operational Notes>
`,
  isReadOnly: true,
  isLocalOnly: true,
  inputSchema: devserverWaitForBuildToolInputSchema.shape,
  outputSchema: devserverWaitForBuildToolOutputSchema.shape,
  factory: (context) => (input) => {
    return waitForDevserverBuild(input, context);
  },
});
