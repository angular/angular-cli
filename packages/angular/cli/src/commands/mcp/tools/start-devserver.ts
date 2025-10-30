/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createServer } from 'net';
import { z } from 'zod';
import { LocalDevServer, devServerKey } from '../dev-server';
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
});

export type StartDevserverToolInput = z.infer<typeof startDevserverToolInputSchema>;

const startDevserverToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
  address: z
    .string()
    .optional()
    .describe(
      'If the operation was successful, this is the HTTP address that the server can be found at.',
    ),
});

export type StartDevserverToolOutput = z.infer<typeof startDevserverToolOutputSchema>;

/**
 * Finds an available TCP port on the system.
 */
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    // Create a new temporary server from Node's net library.
    const server = createServer();

    server.once('error', (err: unknown) => {
      reject(err);
    });

    // Listen on port 0 to let the OS assign an available port.
    server.listen(0, () => {
      const address = server.address();

      // Ensure address is an object with a port property.
      if (address && typeof address === 'object') {
        const port = address.port;

        server.close();
        resolve(port);
      } else {
        reject(new Error('Unable to retrieve address information from server.'));
      }
    });
  });
}

function localhostAddress(port: number) {
  return `http://localhost:${port}/`;
}

async function startDevserver(input: StartDevserverToolInput, context: McpToolContext, host: Host) {
  const projectKey = devServerKey(input.project);

  let devServer = context.devServers.get(projectKey);
  if (devServer) {
    return createStructureContentOutput({
      message: `Development server for project '${projectKey}' is already running.`,
      address: localhostAddress(devServer.port),
    });
  }

  const port = await getAvailablePort();

  devServer = new LocalDevServer({ host, project: input.project, port });
  devServer.start();

  context.devServers.set(projectKey, devServer);

  return createStructureContentOutput({
    message: `Development server for project '${projectKey}' started and watching for workspace changes.`,
    address: localhostAddress(port),
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
* **Starting the Server:** Use this tool to begin serving the application. The tool will return immediately while the server runs in the
  background.
* **Get Build Logs:** Once a dev server has started, use the "wait_for_devserver_build" tool to ensure it's alive. If there are any build
  errors, "wait_for_devserver_build" would provide them back and you can give them to the user or rely on them to propose a fix.
</Use Cases>
<Operational Notes>
* This tool manages development servers by itself. It maintains at most a single dev server instance for each project in the monorepo.
* This is an asynchronous operation. Subsequent commands can be ran while the server is active.
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
