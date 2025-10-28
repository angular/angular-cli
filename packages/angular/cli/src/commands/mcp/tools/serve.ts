/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ChildProcess, spawn } from 'child_process';
import { z } from 'zod';
import { McpToolContext, declareTool } from './tool-registry';

let devServerProcess: ChildProcess | null = null;
const serverLogs: string[] = [];

const serveToolInputSchema = z.object({
  command: z.enum(['start_devserver', 'stop_devserver']).describe('The subcommand to execute.'),
  project: z
    .string()
    .optional()
    .describe(
      'Which project to serve in a monorepo context. If not provided, serves the top-level project.',
    ),
  configuration: z
    .string()
    .optional()
    .default('development')
    .describe('Which build configuration to use. Defaults to "development".'),
});

export type ServeToolInput = z.infer<typeof serveToolInputSchema>;

const serveToolOutputSchema = z.object({
  message: z.string().describe('A message indicating the result of the operation.'),
  logs: z.array(z.string()).optional().describe('The logs from the dev server.'),
});

export type ServeToolOutput = z.infer<typeof serveToolOutputSchema>;

function serveToolFactory(context: McpToolContext) {
  return (input: ServeToolInput) => {
    switch (input.command) {
      case 'start_devserver':
        if (devServerProcess) {
          return {
            structuredContent: {
              message: 'Development server is already running.',
            },
          };
        }

        const args = ['serve'];
        if (input.project) {
          args.push(input.project);
        }
        if (input.configuration) {
          args.push(`--configuration=${input.configuration}`);
        }

        serverLogs.length = 0; // Clear previous logs
        devServerProcess = spawn('ng', args, { stdio: 'pipe' });

        devServerProcess.stdout?.on('data', (data) => {
          serverLogs.push(data.toString());
        });
        devServerProcess.stderr?.on('data', (data) => {
          serverLogs.push(data.toString());
        });

        devServerProcess.on('close', () => {
          devServerProcess = null;
        });

        return {
          structuredContent: {
            message: 'Development server started.',
          },
        };

      case 'stop_devserver':
        if (!devServerProcess) {
          return {
            structuredContent: {
              message: 'Development server is not running.',
            },
          };
        }

        devServerProcess.kill('SIGTERM');
        devServerProcess = null;

        return {
          structuredContent: {
            message: 'Development server stopped.',
            logs: serverLogs,
          },
        };
    }
  };
}

export const SERVE_TOOL = declareTool({
  name: 'serve',
  title: 'Serve Tool',
  description: `
<Purpose>
Manages the Angular development server ("ng serve"). It allows you to start and stop the server as a background process.
</Purpose>
<Use Cases>
* **Starting the Server:** Use the 'start_devserver' command to begin serving the application. The tool will return immediately while the server runs in the background.
* **Stopping the Server:** Use the 'stop_devserver' command to terminate the running development server and retrieve the logs.
</Use Cases>
<Operational Notes>
* This tool manages a single, shared development server instance.
* 'start_devserver' is asynchronous. Subsequent commands can be run while the server is active.
* 'stop_devserver' should be called to gracefully shut down the server and access the full log output.
</Operational Notes>
`,
  isReadOnly: false,
  isLocalOnly: true,
  inputSchema: serveToolInputSchema.shape,
  outputSchema: serveToolOutputSchema.shape,
  factory: serveToolFactory,
});
