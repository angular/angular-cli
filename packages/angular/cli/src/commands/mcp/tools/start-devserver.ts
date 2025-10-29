/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { DevServer, LocalDevServer } from '../dev-server';
import { Host, LocalWorkspaceHost } from '../host';
import { createStructureContentOutput } from '../utils';
import { McpToolContext, McpToolDeclaration, declareTool } from './tool-registry';

const startDevserverToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to serve in a monorepo context. If not provided, serves the default project.',
    ),
  port: z.number().optional().describe('Port to listen on.'),
});

export type StartDevserverToolInput = z.infer<typeof startDevserverToolInputSchema>;

const startDevserverToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
});

export type StartDevserverToolOutput = z.infer<typeof startDevserverToolOutputSchema>;

export const DEFAULT_PROJECT_KEY = '<default>';

function startDevserver(input: StartDevserverToolInput, context: McpToolContext, host: Host) {
  const projectKey = input.project ?? DEFAULT_PROJECT_KEY;
  if (context.devServers?.has(projectKey)) {
    return createStructureContentOutput({
      message: `Development server for project '${projectKey}' is already running.`,
    });
  }

  const devServer = new LocalDevServer({ host, project: input.project, port: input.port });
  devServer.start();

  if (!context.devServers) {
    context.devServers = new Map<string, DevServer>();
  }
  context.devServers.set(projectKey, devServer);

  return createStructureContentOutput({
    message: `Development server for project '${projectKey}' started.`,
  });
}

export const START_DEVSERVER_TOOL: McpToolDeclaration<
  typeof startDevserverToolInputSchema.shape,
  typeof startDevserverToolOutputSchema.shape
> = declareTool({
  name: 'start_devserver',
  title: 'Start Development Server',
  description: `
<Purpose>
Starts the Angular development server ("ng serve") as a background process.
</Purpose>
<Use Cases>
* **Starting the Server:** Use this tool to begin serving the application. The tool will return immediately
  while the server runs in the background.
</Use Cases>
<Operational Notes>
* This tool manages a development server instance for each project.
* This is an asynchronous operation. Subsequent commands can be run while the server is active.
* Use 'stop_devserver' to gracefully shut down the server and access the full log output.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: startDevserverToolInputSchema.shape,
  outputSchema: startDevserverToolOutputSchema.shape,
  factory: (context) => (input) => {
    return startDevserver(input, context, LocalWorkspaceHost);
  },
});
