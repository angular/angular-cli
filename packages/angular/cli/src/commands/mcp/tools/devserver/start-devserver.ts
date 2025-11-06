/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { LocalDevServer, devServerKey } from '../../dev-server';
import { type Host, LocalWorkspaceHost } from '../../host';
import { createStructuredContentOutput } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';

const startDevServerToolInputSchema = z.object({
  project: z
    .string()
    .optional()
    .describe(
      'Which project to serve in a monorepo context. If not provided, serves the default project.',
    ),
});

export type StartDevserverToolInput = z.infer<typeof startDevServerToolInputSchema>;

const startDevServerToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
  address: z
    .string()
    .optional()
    .describe(
      'If the operation was successful, this is the HTTP address that the server can be found at.',
    ),
});

export type StartDevserverToolOutput = z.infer<typeof startDevServerToolOutputSchema>;

function localhostAddress(port: number) {
  return `http://localhost:${port}/`;
}

export async function startDevServer(
  input: StartDevserverToolInput,
  context: McpToolContext,
  host: Host,
) {
  const projectKey = devServerKey(input.project);

  let devServer = context.devServers.get(projectKey);
  if (devServer) {
    return createStructuredContentOutput({
      message: `Development server for project '${projectKey}' is already running.`,
      address: localhostAddress(devServer.port),
    });
  }

  const port = await host.getAvailablePort();

  devServer = new LocalDevServer({ host, project: input.project, port });
  devServer.start();

  context.devServers.set(projectKey, devServer);

  return createStructuredContentOutput({
    message: `Development server for project '${projectKey}' started and watching for workspace changes.`,
    address: localhostAddress(port),
  });
}

export const START_DEVSERVER_TOOL: McpToolDeclaration<
  typeof startDevServerToolInputSchema.shape,
  typeof startDevServerToolOutputSchema.shape
> = declareTool({
  name: 'start_devserver',
  title: 'Start Development Server',
  description: `
<Purpose>
Starts the Angular development server ("ng serve") as a background process. Follow this up with "wait_for_devserver_build" to wait until
the first build completes.
</Purpose>
<Use Cases>
* **Starting the Server:** Use this tool to begin serving the application. The tool will return immediately while the server runs in the
  background.
* **Get Initial Build Logs:** Once a dev server has started, use the "wait_for_devserver_build" tool to ensure it's alive. If there are any
  build errors, "wait_for_devserver_build" would provide them back and you can give them to the user or rely on them to propose a fix.
* **Get Updated Build Logs:** Important: as long as a devserver is alive (i.e. "stop_devserver" wasn't called), after every time you make a
  change to the workspace, re-run "wait_for_devserver_build" to see whether the change was successfully built and wait for the devserver to
  be updated.
</Use Cases>
<Operational Notes>
* This tool manages development servers by itself. It maintains at most a single dev server instance for each project in the monorepo.
* This is an asynchronous operation. Subsequent commands can be ran while the server is active.
* Use 'stop_devserver' to gracefully shut down the server and access the full log output.
</Operational Notes>
`,
  isReadOnly: true,
  isLocalOnly: true,
  inputSchema: startDevServerToolInputSchema.shape,
  outputSchema: startDevServerToolOutputSchema.shape,
  factory: (context) => (input) => {
    return startDevServer(input, context, LocalWorkspaceHost);
  },
});
