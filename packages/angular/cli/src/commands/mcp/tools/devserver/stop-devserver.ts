/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { devServerKey } from '../../dev-server';
import { createStructuredContentOutput } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';

const stopDevserverToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to stop serving in a monorepo context. If not provided, stops the default project server.',
    ),
});

export type StopDevserverToolInput = z.infer<typeof stopDevserverToolInputSchema>;

const stopDevserverToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
  logs: z.array(z.string()).optional().describe('The full logs from the dev server.'),
});

export type StopDevserverToolOutput = z.infer<typeof stopDevserverToolOutputSchema>;

export function stopDevserver(input: StopDevserverToolInput, context: McpToolContext) {
  const projectKey = devServerKey(input.project);
  const devServer = context.devServers.get(projectKey);

  if (!devServer) {
    return createStructuredContentOutput({
      message: `Development server for project '${projectKey}' was not running.`,
      logs: undefined,
    });
  }

  devServer.stop();
  context.devServers.delete(projectKey);

  return createStructuredContentOutput({
    message: `Development server for project '${projectKey}' stopped.`,
    logs: devServer.getServerLogs(),
  });
}

export const STOP_DEVSERVER_TOOL: McpToolDeclaration<
  typeof stopDevserverToolInputSchema.shape,
  typeof stopDevserverToolOutputSchema.shape
> = declareTool({
  name: 'stop_devserver',
  title: 'Stop Development Server',
  description: `
<Purpose>
Stops a running Angular development server ("ng serve") that was started with the "start_devserver" tool.
</Purpose>
<Use Cases>
* **Stopping the Server:** Use this tool to terminate a running development server and retrieve the logs.
</Use Cases>
<Operational Notes>
* This should be called to gracefully shut down the server and access the full log output.
* This just sends a SIGTERM to the server and returns immediately; so the server might still be functional for a short
  time after this is called. However note that this is not a blocker for starting a new devserver.
</Operational Notes>
`,
  isReadOnly: true,
  isLocalOnly: true,
  inputSchema: stopDevserverToolInputSchema.shape,
  outputSchema: stopDevserverToolOutputSchema.shape,
  factory: (context) => (input) => {
    return stopDevserver(input, context);
  },
});
