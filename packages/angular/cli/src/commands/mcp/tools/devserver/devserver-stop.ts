/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { devserverKey } from '../../devserver';
import { createStructuredContentOutput } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';

const devserverStopToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to stop serving in a monorepo context. If not provided, stops the default project server.',
    ),
});

export type DevserverStopToolInput = z.infer<typeof devserverStopToolInputSchema>;

const devserverStopToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
  logs: z.array(z.string()).optional().describe('The full logs from the dev server.'),
});

export type DevserverStopToolOutput = z.infer<typeof devserverStopToolOutputSchema>;

export function stopDevserver(input: DevserverStopToolInput, context: McpToolContext) {
  const projectKey = devserverKey(input.project);
  const devServer = context.devservers.get(projectKey);

  if (!devServer) {
    return createStructuredContentOutput({
      message: `Development server for project '${projectKey}' was not running.`,
      logs: undefined,
    });
  }

  devServer.stop();
  context.devservers.delete(projectKey);

  return createStructuredContentOutput({
    message: `Development server for project '${projectKey}' stopped.`,
    logs: devServer.getServerLogs(),
  });
}

export const DEVSERVER_STOP_TOOL: McpToolDeclaration<
  typeof devserverStopToolInputSchema.shape,
  typeof devserverStopToolOutputSchema.shape
> = declareTool({
  name: 'devserver.stop',
  title: 'Stop Development Server',
  description: `
<Purpose>
Stops a running Angular development server ("ng serve") that was started with the "devserver.start" tool.
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
  inputSchema: devserverStopToolInputSchema.shape,
  outputSchema: devserverStopToolOutputSchema.shape,
  factory: (context) => (input) => {
    return stopDevserver(input, context);
  },
});
